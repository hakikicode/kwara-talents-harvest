import crypto from "crypto";
import { db } from "../firebase/admin.js";

export const config = {
  api: {
    bodyParser: false // ✅ REQUIRED FOR PAYSTACK
  }
};

async function getRawBody(req) {
  const buffers = [];

  for await (const chunk of req) {
    buffers.push(chunk);
  }

  return Buffer.concat(buffers);
}

export default async function handler(req, res) {

  const rawBody = await getRawBody(req);

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  const signature = req.headers["x-paystack-signature"];

  if (hash !== signature) {
    console.log("❌ Invalid signature");
    return res.status(401).end();
  }

  const event = JSON.parse(rawBody.toString());

  if (event.event !== "charge.success")
    return res.sendStatus(200);

  const data = event.data;

  const reference = data.reference;
  const contestantId = data.metadata?.contestantId;
  const votes = Number(data.metadata?.votes || 1);

  if (!reference || !contestantId)
    return res.sendStatus(200);

  try {

    const logRef = db.ref(`transactions/${reference}`);
    const exists = await logRef.get();

    if (exists.exists()) {
      console.log("Duplicate payment");
      return res.sendStatus(200);
    }

    await logRef.set({
      contestantId,
      votes,
      status: "success",
      created_at: Date.now()
    });

    await db
      .ref(`contestants/${contestantId}/votes`)
      .transaction(v => (v || 0) + votes);

    console.log("✅ Votes added:", votes);

  } catch (err) {
    console.error(err);
  }

  res.sendStatus(200);
}