export default async function handler(req, res) {
  const { email, contestantId, votes } = req.body;

  const amount = votes * 350 * 100; // Paystack uses kobo

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount,
        callback_url: `${process.env.BASE_URL}/success.html`,
        metadata: {
          contestantId,
          votes
        },

        // SPLIT
        subaccount: process.env.ECOBANK_SUBACCOUNT,
        transaction_charge: 27500 // ₦275 in kobo
      })
    });

    const data = await response.json();

    if (!data.status) {
      console.error(data);
      return res.status(400).json({
       error: "Paystack initialization failed"
      });
    }

    res.status(200).json({
      authorization_url: data.data.authorization_url
    });

  } catch (err) {
    res.status(500).json({ error: "Payment init failed" });
  }
}