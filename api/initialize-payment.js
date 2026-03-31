export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contestantId, votes, email } = req.body || {};
  const voteCount = Number(votes);
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY;

  if (!contestantId || !voteCount || !email) {
    return res.status(400).json({
      error: "Missing fields (email, contestantId, votes required)"
    });
  }

  if (!secretKey || !publicKey) {
    return res.status(500).json({
      error: "Payment keys are not configured on the server"
    });
  }

  const amount = voteCount * 350 * 100;
  const reference = `KTH-${Date.now()}-${contestantId}`;

  const payload = {
    email,
    amount,
    reference,
    metadata: {
      contestantId,
      votes: voteCount
    }
  };

  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    payload.callback_url = `${baseUrl.replace(/\/$/, "")}/vote.html?success=true`;
  }

  const subaccount = process.env.ECOBANK_SUBACCOUNT;
  if (subaccount) {
    payload.subaccount = subaccount;
    payload.transaction_charge = 27500 * voteCount;
    payload.bearer = "account";
  }

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error("PAYSTACK ERROR:", data);
      return res.status(response.status || 400).json({
        error: data.message || "Initialization failed"
      });
    }

    return res.json({
      reference,
      amount,
      publicKey,
      authorizationUrl: data.data?.authorization_url || null
    });
  } catch (err) {
    console.error("INIT ERROR:", err);
    return res.status(500).json({ error: "Payment init failed" });
  }
}
