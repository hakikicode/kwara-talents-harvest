import { db } from "./firebase/admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    contestantId,
    contestantName,
    ticketQty,
    votes,
    amount,
    payer,
    reference,
    proof,
    email,
    phone,
    type
  } = req.body || {};

  const paymentType = type || (ticketQty ? "event-ticket" : "vote");
  const quantity = Number(ticketQty || votes || 0);
  const amountValue = Number(amount);

  if (!contestantId || quantity <= 0 || !amountValue || !payer || !reference || !proof) {
    return res.status(400).json({
      error: "Missing fields (contestantId, quantity, amount, payer, reference, proof required)"
    });
  }

  try {
    const id = String(Date.now());

    await db.ref(`manual_payments/${id}`).set({
      contestantId,
      contestantName: contestantName || contestantId,
      type: paymentType,
      ticketQty: Number(ticketQty || 0),
      votes: Number(votes || 0),
      amount: amountValue,
      payer,
      reference,
      proof,
      email: email || null,
      phone: phone || null,
      status: "pending",
      created_at: Date.now()
    });

    return res.json({ success: true, id });
  } catch (err) {
    console.error("MANUAL PAYMENT ERROR:", err);
    return res.status(500).json({ error: "Failed to save manual payment" });
  }
}
