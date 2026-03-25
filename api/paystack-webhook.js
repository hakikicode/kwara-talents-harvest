import crypto from "crypto";
import { db } from "../firebase/setup.js";
import { ref, runTransaction, get, set } from "firebase/database";

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
    const amount = data.amount / 100; // convert from kobo

    console.log("✅ PAYMENT:", reference, contestantId, votes);

    if (!contestantId || !reference) {
      console.log("❌ Missing data");
      return res.sendStatus(200);
    }

    try {

      // 🔥 STEP 1: PREVENT DUPLICATE PAYMENT
      const logRef = ref(db, `transactions/${reference}`);
      const existing = await get(logRef);

      if (existing.exists()) {
        console.log("⚠️ Duplicate payment ignored:", reference);
        return res.sendStatus(200);
      }

      // 🔥 STEP 2: SAVE TRANSACTION LOG
      await set(logRef, {
        contestantId,
        votes,
        amount,
        status: "success",
        created_at: Date.now()
      });

      // 🔥 STEP 3: UPDATE VOTES
      await runTransaction(
        ref(db, `contestants/${contestantId}/votes`),
        v => (v || 0) + votes
      );

      console.log("🔥 Votes updated:", contestantId, votes);

    } catch (err) {
      console.error("Webhook error:", err);
    }
  }

  res.sendStatus(200);
}