export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contestantId, votes, email, ticketQty, amount, type, buyerName, buyerPhone } = req.body || {};
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY;

  if (!secretKey || !publicKey) {
    return res.status(500).json({
      error: "Payment keys are not configured on the server"
    });
  }

  let paymentAmount = 0;
  let metadata = {};
  let callbackUrl = null;
  const baseUrl = process.env.BASE_URL;

  // Handle voting payments
  if (type === "vote" || !type) {
    const voteCount = Number(votes);
    if (!contestantId || !voteCount || !email) {
      return res.status(400).json({
        error: "Missing fields for voting (email, contestantId, votes required)"
      });
    }
    paymentAmount = voteCount * 350 * 100; // 350 naira per vote in kobo
    metadata = { contestantId, votes: voteCount };
    if (baseUrl) {
      callbackUrl = `${baseUrl.replace(/\/$/, "")}/vote.html?success=true`;
    }
  }
  // Handle event ticket payments
  else if (type === "event-ticket") {
    const ticketQuantity = Number(ticketQty);
    const ticketAmount = Number(amount);
    if (!contestantId || !ticketQuantity || ticketQuantity <= 0 || !email || !ticketAmount) {
      return res.status(400).json({
        error: "Missing fields for event ticket (email, contestantId, ticketQty, amount required)"
      });
    }
    paymentAmount = ticketAmount * 100; // Convert to kobo
    metadata = { 
      contestantId, 
      ticketQty: ticketQuantity,
      buyerName: buyerName || "Guest",
      buyerPhone: buyerPhone || ""
    };
    if (baseUrl) {
      callbackUrl = `${baseUrl.replace(/\/$/, "")}/event.html?success=true`;
    }
  }
  else {
    return res.status(400).json({
      error: "Invalid payment type. Use 'vote' or 'event-ticket'"
    });
  }

  const reference = `KTH-${Date.now()}-${contestantId}`;

  const payload = {
    email,
    amount: paymentAmount,
    reference,
    metadata
  };

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  const subaccount = process.env.ECOBANK_SUBACCOUNT;
  if (subaccount) {
    payload.subaccount = subaccount;
    payload.transaction_charge = type === "event-ticket" ? 27500 : 27500;
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
