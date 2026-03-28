import { db } from "../firebase/admin.js";

export default async function handler(req, res){

  const { paymentId } = req.body;

  const paymentRef = db.ref(`manual_payments/${paymentId}`);
  const snap = await paymentRef.get();

  if (!snap.exists()) {
    return res.status(404).json({ error: "Not found" });
  }

  const data = snap.val();

  if (data.status === "approved") {
    return res.json({ message: "Already approved" });
  }

  await db.ref(`contestants/${data.contestantId}/votes`)
    .transaction(v => (v || 0) + data.votes);

  await paymentRef.update({
    status: "approved",
    approved_at: Date.now()
  });

  res.json({ success: true });
}