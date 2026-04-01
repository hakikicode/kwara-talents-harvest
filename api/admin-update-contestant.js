import { db } from "./firebase/admin.js";
import { requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const { contestantId, updates } = req.body || {};

  if (!contestantId || !updates || typeof updates !== "object") {
    return res.status(400).json({ error: "Missing contestant update payload" });
  }

  const allowed = {};

  if (typeof updates.status === "string") {
    allowed.status = updates.status;
  }

  if (typeof updates.voting_enabled === "boolean") {
    allowed.voting_enabled = updates.voting_enabled;
  }

  if (!Object.keys(allowed).length) {
    return res.status(400).json({ error: "No allowed update fields provided" });
  }

  try {
    await db.ref(`contestants/${contestantId}`).update(allowed);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update contestant" });
  }
}
