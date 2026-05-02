import { db } from "./firebase/admin.js";
import { requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const { id } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {

    const refPay = db.ref(`manual_payments/${id}`);
    const snap = await refPay.get();

    if (!snap.exists()) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const data = snap.val();
    const contestantId = data.contestantId;
    const paymentType = data.type || (data.ticketQty ? "event-ticket" : "vote");

    // ✅ prevent double approval
    if (data.status === "approved") {
      return res.json({ success: true });
    }

    if (paymentType === "event-ticket") {
      const ticketQty = Number(data.ticketQty || 1);
      const amount = Number(data.amount || 0);
      const ticketCode = `KTH-${contestantId}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const ticketId = `${contestantId}-${Date.now()}`;
      const tableNumber = Math.floor(Math.random() * 100) + 1;

      await db.ref(`eventTickets/${contestantId}/tickets/${ticketId}`).set({
        email: data.email || null,
        name: data.payer || "Manual Payment",
        phone: data.phone || null,
        quantity: ticketQty,
        amount,
        timestamp: Date.now(),
        status: "pending",
        adminApproved: false,
        ticketCode,
        tableNumber,
        manual: true,
        paymentRef: data.reference
      });

      await db.ref(`eventTickets/${contestantId}/reserved`).transaction(v => (v || 0) + ticketQty);
    } else {
      const votes = Number(data.votes || 1);
      await db.ref(`contestants/${contestantId}/votes`)
        .transaction(v => (v || 0) + votes);
    }

    // ✅ UPDATE STATUS
    await refPay.update({
      status: "approved",
      approved_at: Date.now()
    });

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
}
