import crypto from "crypto";
import { db } from "../firebase/setup.js";
import { ref, runTransaction } from "firebase/database";

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

    const contestantId = event.data.metadata.contestantId;

    await runTransaction(
      ref(db, `contestants/${contestantId}/votes`),
      v => (v || 0) + 1
    );
  }

  res.sendStatus(200);
}