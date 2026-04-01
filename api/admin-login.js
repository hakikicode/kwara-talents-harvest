import {
  createAdminToken,
  getAdminConfig,
  setAdminCookie
} from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};
  const admin = getAdminConfig();

  if (username !== admin.username || password !== admin.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createAdminToken({
    username,
    role: "admin",
    exp: Date.now() + 8 * 60 * 60 * 1000
  });

  setAdminCookie(res, token);

  return res.json({
    success: true,
    token,
    username
  });
}
