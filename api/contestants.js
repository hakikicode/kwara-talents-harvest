export default async function handler(req, res) {

  // ✅ CORS FIX
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const response = await fetch(
      "https://api.github.com/repos/hakikicode/kwara-talents-harvest/contents/public/contestants"
    );

    const files = await response.json();

    const contestants = files
      .filter(file =>
        file.name.match(/\.(jpg|jpeg|png|webp)$/i)
      )
      .map((file, index) => ({
        id: `CT${index + 1}`,   // identifier only
        image: file.download_url,
        votes: 0
      }));

    res.status(200).json(contestants);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load contestants" });
  }
}