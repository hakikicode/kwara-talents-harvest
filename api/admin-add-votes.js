import { db } from "../firebase/admin.js";

function sanitizeId(id) {
  return id
    ?.replace(/\.[^/.]+$/, "")
    ?.replace(/[.#$\[\]]/g, "");
}

export default async function handler(req, res) {

  try {

    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    if (!db)
      throw new Error("Firebase DB not initialized");

    const { contestantId, votes } = req.body;

    if (!contestantId || !votes)
      return res.status(400).json({
        error: "Missing contestantId or votes"
      });

    const safeId = sanitizeId(contestantId);

    await db
      .ref(`contestants/${safeId}/votes`)
      .transaction(v => (v || 0) + Number(votes));

    res.json({
      success: true,
      contestantId: safeId,
      votesAdded: Number(votes)
    });

  } catch (err) {

    console.error("ADMIN ADD VOTES ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
}