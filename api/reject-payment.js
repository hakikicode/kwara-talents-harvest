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
    const paymentRef = db.ref(`manual_payments/${id}`);
    const snap = await paymentRef.get();

    if (!snap.exists()) {
      return res.status(404).json({ error: "Payment not found" });
    }

    await paymentRef.update({
      status: "rejected",
      rejected_at: Date.now()
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
}
