export default async function handler(req, res) {
  try {

    const response = await fetch(
      "https://api.github.com/repos/hakikicode/kwara-talents-harvest/contents/public/contestants"
    );

    const files = await response.json();

    const contestants = files
      .filter(file =>
        /\.(jpg|jpeg|png|webp)$/i.test(file.name)
      )
      .map((file, index) => ({
        id: index + 1,
        image: file.download_url,
        votes: 0
      }));

    res.status(200).json(contestants);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load contestants" });
  }
}