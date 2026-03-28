import { db } from "../firebase/admin.js";

export default async function handler(req, res){

  const { contestantId, votes, payer, reference } = req.body;

  const id = Date.now();

  await db.ref(`manual_payments/${id}`).set({
    contestantId,
    votes,
    payer,
    reference,
    status: "pending",
    created_at: Date.now()
  });

  res.json({ success:true });
}