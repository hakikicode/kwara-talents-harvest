import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {

    await db.ref(`manual_payments/${id}`).update({
      status: "rejected",
      rejected_at: Date.now()
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
}