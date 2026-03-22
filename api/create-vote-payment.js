export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contestantId, amount } = req.body;

  try {
    // ⚠️ use API  Paystack
    // real payment OR integrate via merchant dashboard

    // Or, redirect to manual payment instruction page
    const paymentUrl = `kwaratalentsharvest.com.ng/pay.html?contestantId=${contestantId}&amount=${amount}`;

    res.status(200).json({ paymentUrl });

  } catch (err) {
    res.status(500).json({ error: "Payment init failed" });
  }
}