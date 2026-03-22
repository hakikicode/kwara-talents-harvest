import { db } from "../firebase/setup.js";

export default async function handler(req,res){

  const { contestantId, votes, payer, reference } = req.body;

  await db.collection("manual_payments").add({
    contestantId,
    votes,
    payer,
    reference,
    status:"pending",
    created_at:new Date()
  });

  res.json({ success:true });
}