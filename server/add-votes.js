import { db } from "./firebase/admin.js";
import { requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const { contestantId, votes } = req.body || {};
  const voteCount = Number(votes);

  if (!contestantId || !voteCount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {

    await db.ref(`contestants/${contestantId}/votes`)
      .transaction(v => (v || 0) + voteCount);

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
}
