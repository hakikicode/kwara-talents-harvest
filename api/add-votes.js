import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  const { contestantId, votes } = req.body;

  if (!contestantId || !votes) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {

    await db.ref(`contestants/${contestantId}/votes`)
      .transaction(v => (v || 0) + Number(votes));

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
}