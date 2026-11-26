// Shared helpers for The Golden Sip API (Vercel serverless functions).
const crypto = require("crypto");
const { promisify } = require("util");
const pbkdf2 = promisify(crypto.pbkdf2);

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SECRET = process.env.SESSION_SECRET || REDIS_TOKEN || "change-me";

// Original owner login (same hashes that were inside app.js): your CURRENT email/phone + password keep working.
const LEGACY_PW = "6622e7a92227fde47464de4e5b74efd47166f4797305c1af250e3d14ff73a6cb";
const LEGACY_IDS = [
  "957f550879928f79868075e1ad0e8fa183b81b61926c0ecb613a44aedad63333",
  "81d08a0536906dcabaff94c919096752e44522c00fe7b1e0dbd4a99e35a260b2",
];

async function redis(...cmd) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("DB_NOT_CONFIGURED");
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + REDIS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || "DB_ERROR");
  return j.result;
}

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const slow = async (t) => (await pbkdf2(t, "gs-owner-v1", 150000, 32, "sha256")).toString("hex");

function normId(id) {
  id = String(id || "").trim().toLowerCase();
  return id.includes("@") ? id : id.replace(/\D/g, "").slice(-10);
}

async function checkLogin(id, pw) {
  id = normId(id); pw = String(pw || "");
  if (!id || !pw) return false;
  const idHash = await slow("id:" + id);
  const idOk = LEGACY_IDS.includes(idHash);
  const pwOk = safeEq(await slow("pw:" + pw), LEGACY_PW);
  return idOk && pwOk;
}

// Signed session token (12 hours)
function makeToken() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 3600 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}
function verifyToken(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [body, sig] = t.split(".");
  if (!body || !sig) return false;
  const good = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!safeEq(sig, good)) return false;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()).exp > Date.now(); } catch (_) { return false; }
}

function readBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  return b || {};
}
const clientIp = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";

module.exports = { redis, sha, checkLogin, makeToken, verifyToken, readBody, clientIp };
