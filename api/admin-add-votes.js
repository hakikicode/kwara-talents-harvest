import { db } from "../firebase/admin.js";

export default async function handler(req,res){

  const { contestantId, votes } = req.body;

  if(!contestantId || !votes)
    return res.status(400).end();

  await db
    .ref(`contestants/${contestantId}/votes`)
    .transaction(v => (v || 0) + Number(votes));

  await db.ref("manual_logs").push({
    contestantId,
    votes,
    created_at: Date.now()
  });

  res.json({ success:true });
}