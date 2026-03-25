import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  const { contestantId, votes, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  await db
    .ref(`contestants/${contestantId}/votes`)
    .transaction(v => (v || 0) + Number(votes));

  res.json({ success: true });
}