export default async function handler(req, res) {
  const { email, contestantId } = req.body;

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: 35000, // in kobo (₦350)
        callback_url: `${process.env.BASE_URL}/success.html`,
        metadata: {
          contestantId
        },
        subaccount: process.env.DEVELOPER_SUBACCOUNT_CODE
      })
    });

    const data = await response.json();

    res.status(200).json({
      authorization_url: data.data.authorization_url
    });

  } catch (err) {
    res.status(500).json({ error: "Payment init failed" });
  }
}