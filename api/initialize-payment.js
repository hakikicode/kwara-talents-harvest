export default async function handler(req, res) {

  const { contestantId, votes } = req.body;

  if (!email || !contestantId || !votes) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const amount = Number(votes) * 350 * 100;

  try {

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount,
          callback_url:
            `${process.env.BASE_URL}/success.html`,

          metadata: {
            contestantId,
            votes
          },

          ...(process.env.ECOBANK_SUBACCOUNT && {
            subaccount: process.env.ECOBANK_SUBACCOUNT,
            transaction_charge: 27500
          })
        })
      }
    );

    const data = await response.json();

    if (!data.status) {
      console.error("PAYSTACK ERROR:", data);
      return res.status(400).json({
        error: data.message || "Initialization failed"
      });
    }

    res.json({
      authorization_url: data.data.authorization_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment init failed" });
  }
}