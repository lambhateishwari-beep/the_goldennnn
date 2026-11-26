// GET  /api/menu  -> public, returns the live menu saved by the owner (or {} if none saved yet)
// POST /api/menu  -> owner only (Bearer token), saves the full menu
const { redis, verifyToken, readBody } = require("./_lib");

const str = (v, n) => String(v == null ? "" : v).slice(0, n);
const num = (v) => { v = Number(v); return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null; };

function clean(b) {
  if (!b || !Array.isArray(b.items) || !Array.isArray(b.cats)) return null;
  if (b.items.length > 1500 || b.cats.length > 100) return null;
  const cats = [...new Set(b.cats.map((c) => str(c, 40).trim()).filter(Boolean))];
  const items = [];
  for (const i of b.items) {
    const price = num(i.price);
    if (!i || !i.id || !i.name || price === null) continue;
    const o = { id: str(i.id, 40), name: str(i.name, 80), cat: str(i.cat, 40), veg: !!i.veg, price, ok: i.ok !== false, loved: !!i.loved, note: str(i.note, 120) };
    const p10 = num(i.p10); if (p10) o.p10 = p10;
    items.push(o);
  }
  return { cats, items, upi: str(b.upi, 80).trim(), phone: str(b.phone, 25).trim(), updated: new Date().toISOString() };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const raw = await redis("GET", "gs:menu");
      return res.status(200).json(raw ? JSON.parse(raw) : {});
    }
    if (req.method === "POST") {
      if (!verifyToken(req)) return res.status(401).json({ error: "Please sign in again" });
      const m = clean(readBody(req));
      if (!m) return res.status(400).json({ error: "Invalid menu data" });
      await redis("SET", "gs:menu", JSON.stringify(m));
      return res.status(200).json({ ok: true, updated: m.updated });
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message === "DB_NOT_CONFIGURED" ? "Database not connected yet (see SETUP.md)" : "Server error" });
  }
};
