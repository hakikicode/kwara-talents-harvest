export default async function handler(req, res) {

  const response = await fetch(
    "https://api.paystack.co/transaction",
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    }
  );

  const data = await response.json();

  res.json(data); // you can process this later
}