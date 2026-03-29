import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {

    const refPay = db.ref(`manual_payments/${id}`);
    const snap = await refPay.get();

    if (!snap.exists()) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const data = snap.val();

    // ✅ prevent double approval
    if (data.status === "approved") {
      return res.json({ success: true });
    }

    const contestantId = data.contestantId;
    const votes = Number(data.votes || 1);

    // ✅ ADD VOTES
    await db.ref(`contestants/${contestantId}/votes`)
      .transaction(v => (v || 0) + votes);

    // ✅ UPDATE STATUS
    await refPay.update({
      status: "approved",
      approved_at: Date.now()
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
}