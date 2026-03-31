import { db } from "./firebase/admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contestantId, votes, payer, reference, proof } = req.body || {};
  const voteCount = Number(votes);

  if (!contestantId || !voteCount || !payer || !reference || !proof) {
    return res.status(400).json({
      error: "Missing fields (contestantId, votes, payer, reference, proof required)"
    });
  }

  try {
    const id = String(Date.now());

    await db.ref(`manual_payments/${id}`).set({
      contestantId,
      votes: voteCount,
      payer,
      reference,
      proof,
      status: "pending",
      created_at: Date.now()
    });

    return res.json({ success: true, id });
  } catch (err) {
    console.error("MANUAL PAYMENT ERROR:", err);
    return res.status(500).json({ error: "Failed to save manual payment" });
  }
}
