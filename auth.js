// POST /api/auth   body: { action: "login", id, password }
const { redis, sha, checkLogin, makeToken, readBody, clientIp } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = readBody(req);
  try {
    /* ---- login ---- */
    if (b.action === "login") {
      const k = "gs:tries:" + sha(clientIp(req));
      const n = await redis("INCR", k);
      if (n === 1) await redis("EXPIRE", k, 900);
      if (n > 10) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
      if (!(await checkLogin(b.id, b.password))) return res.status(401).json({ error: "Wrong email, phone or password" });
      await redis("DEL", k);
      return res.status(200).json({ token: makeToken() });
    }

    res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    const msg = (e.message || "") === "DB_NOT_CONFIGURED" ? "Database not connected yet (see SETUP.md)" : "Server error";
    res.status(500).json({ error: msg });
  }
};
