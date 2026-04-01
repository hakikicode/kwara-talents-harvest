import { db } from "./firebase/admin.js";
import { requireAdmin } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const { contestantId } = req.body || {};

  if (!contestantId) {
    return res.status(400).json({ error: "Missing contestantId" });
  }

  try {
    const contestantRef = db.ref(`contestants/${contestantId}`);
    const snap = await contestantRef.get();

    if (!snap.exists()) {
      return res.status(404).json({ error: "Contestant not found" });
    }

    await contestantRef.remove();

    return res.json({ success: true, contestantId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete contestant" });
  }
}
