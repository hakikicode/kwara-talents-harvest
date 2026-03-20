import { db } from "../firebase/setup.js";
import { ref, runTransaction } from "firebase/database";

export default async function handler(req, res) {
  const { contestantId, reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: "No reference" });
  }

  try {
    // ⚠️ Ideally verify payment manually or via webhook

    await runTransaction(ref(db, `contestants/${contestantId}/votes`), v => (v || 0) + 1);

    res.status(200).json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
}