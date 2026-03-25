import crypto from "crypto";
import { db } from "../firebase/admin.js";

export default async function handler(req, res) {

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  if (event.event === "charge.success") {

    const data = event.data;

    const reference = data.reference;
    const contestantId = data.metadata?.contestantId;
    const votes = Number(data.metadata?.votes || 1);
    const amount = data.amount / 100;

    if (!reference || !contestantId)
      return res.sendStatus(200);

    try {

      // ✅ prevent duplicates
      const logRef =
        db.ref(`transactions/${reference}`);

      const existing = await logRef.get();

      if (existing.exists()) {
        console.log("Duplicate ignored");
        return res.sendStatus(200);
      }

      // ✅ save transaction
      await logRef.set({
        contestantId,
        votes,
        amount,
        status: "success",
        created_at: Date.now()
      });

      // ✅ increment votes safely
      const voteRef =
        db.ref(`contestants/${contestantId}/votes`);

      await voteRef.transaction(v => (v || 0) + votes);

      console.log("🔥 Votes added:", votes);

    } catch (e) {
      console.error(e);
    }
  }

  res.sendStatus(200);
}