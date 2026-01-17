import { db, bucket } from "../public/firebase/setup.js";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parse error" });
    }

    try {
      let photoURL = "";

      if (files.photo) {
        const file = files.photo;
        const fileName = `contestants/${Date.now()}-${file.originalFilename}`;

        await bucket.upload(file.filepath, {
          destination: fileName,
          metadata: { contentType: file.mimetype },
        });

        photoURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        fs.unlinkSync(file.filepath);
      }

      const contestant = {
        full_name: fields.fullName || "",
        stage_name: fields.stageName || "",
        age: fields.age || "",
        gender: fields.gender || "",
        location: fields.location || "",
        whatsapp: fields.whatsapp || "",
        talents: fields.talents ? fields.talents.split(",") : [],
        bio: fields.bio || "",
        socials: {
          instagram: fields.instagram || "",
          facebook: fields.facebook || "",
          tiktok: fields.tiktok || "",
          youtube: fields.youtube || ""
        },
        photo_url: photoURL,
        video_url: fields.video || "",
        status: "pending",
        votes: 0,
        created_at: new Date()
      };

      await db.collection("contestants").add(contestant);

      res.status(200).json({ success: true });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
}
