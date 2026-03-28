import { db } from "../firebase/admin.js";

export default async function handler(req, res){

  const { contestantId, votes } = req.body;

  await db.ref(`contestants/${contestantId}/votes`)
    .transaction(v => (v || 0) + Number(votes));

  res.json({ success: true });
}