import { db } from "../public/firebase/setup.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    const { id } = req.body;

    await db.collection("contestants").doc(id).update({
      status: "approved"
    });

    res.json({ success: true });

  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
