import crypto from "crypto";

export default async function handler(req, res) {
  const { contestant_id, votes, phone } = req.body;

  const amount = votes * 400;

  const payload = {
    reference: `KTH-${Date.now()}`,
    amount,
    currency: "NGN",
    country: "NG",
    callbackUrl: "https://www.kwaratalentsharvest.com.ng/thanks.html",
    returnUrl: "https://www.kwaratalentsharvest.com.ng/thanks.html",
    customer: { phone },
    meta: { contestant_id, votes }
  };

  res.json(payload); // sent to frontend for OPay SDK
}
