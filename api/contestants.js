export default async function handler(req, res) {

  try {

    const response = await fetch(
      "https://api.github.com/repos/hakikicode/kwara-talents-harvest/contents/public/contestants"
    );

    const files = await response.json();

    // keep only images
    const contestants = files
      .filter(f =>
        f.name.match(/\.(jpg|jpeg|png|webp)$/i)
      )
      .map((file, index) => ({
        id: index + 1,
        image: file.download_url,
        votes: 0
      }));

    res.status(200).json(contestants);

  } catch (err) {
    res.status(500).json({ error: "Failed to load contestants" });
  }
}