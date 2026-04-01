import crypto from "crypto";

const ADMIN_TOKEN_COOKIE = "kth_admin_token";

function getSecret() {
  return process.env.ADMIN_JWT_SECRET || process.env.ADMIN_TOKEN_SECRET || "kth-admin-secret";
}

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "pass";
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

export function getAdminConfig() {
  return {
    username: getAdminUsername(),
    password: getAdminPassword()
  };
}

export function createAdminToken(payload) {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(body);
  return `${body}.${signature}`;
}

export function verifyAdminToken(token) {
  if (!token || !token.includes(".")) return null;

  const [body, signature] = token.split(".");
  const expected = signPayload(body);

  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body));

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function readAdminToken(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${ADMIN_TOKEN_COOKIE}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export function requireAdmin(req, res) {
  const token = readAdminToken(req);
  const payload = verifyAdminToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return payload;
}

export function setAdminCookie(res, token) {
  const maxAge = 60 * 60 * 8;
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
  );
}

export function clearAdminCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
}
