// Bereichsseite: zeigt alle Tools im eigenen Ordner als App-Kacheln.
// Ein Tool = eine .html-Datei im Bereichsordner (oder Unterordner/index.html).
// Symbol optional im Tool-Kopf: <meta name="tool-icon" content="🧾">
const REPO = "Claude-o-Matic/tools";
const AREAS = {
  schule: { name: "Schule", hue: 218 },
  zfsl:   { name: "ZfsL",   hue: 160 },
  privat: { name: "Privat", hue: 24 },
  m2:     { name: "M2",     hue: 280 }
};
const area = location.pathname.split("/").filter(Boolean).pop();
const A = AREAS[area];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
let tools = null;

async function load() {
  const key = "tools-" + area, now = Date.now();
  try { const c = JSON.parse(localStorage.getItem(key)); if (c && now - c.t < 300000) return c.d; } catch (e) {}
  const r = await fetch(`https://api.github.com/repos/${REPO}/git/trees/HEAD?recursive=1`);
  if (!r.ok) throw new Error(r.status);
  const re = new RegExp(`^${area}/(?:([^/]+)/index\\.html|([^/]+)\\.html)$`);
  const files = (await r.json()).tree.map(f => f.path.match(re)).filter(m => m && m[0] !== area + "/index.html");
  const d = await Promise.all(files.map(async m => {
    const name = m[1] || m[2], href = m[1] ? m[1] + "/" : m[2] + ".html";
    let title = name.replace(/[-_]+/g, " "), desc = "", icon = "";
    try {
      const doc = new DOMParser().parseFromString(await (await fetch(href)).text(), "text/html");
      title = doc.title.trim() || title;
      desc = doc.querySelector('meta[name="description"]')?.content || "";
      icon = doc.querySelector('meta[name="tool-icon"]')?.content || "";
    } catch (e) {}
    return { href, title, desc, icon };
  }));
  d.sort((a, b) => a.title.localeCompare(b.title, "de"));
  try { localStorage.setItem(key, JSON.stringify({ t: now, d })); } catch (e) {}
  return d;
}

function render() {
  const q = $("q").value.trim().toLowerCase();
  const list = (tools || []).filter(t => !q || (t.title + " " + t.desc).toLowerCase().includes(q));
  $("grid").innerHTML = list.map(t => {
    const h = (A.hue + (hash(t.title) % 70) - 35 + 360) % 360;
    const sym = t.icon || t.title.trim().charAt(0).toUpperCase();
    return `<a class="app" href="${esc(t.href)}" title="${esc(t.desc || t.title)}">
      <span class="ico" style="--h:${h}">${esc(sym)}</span>
      <span class="lbl">${esc(t.title)}</span></a>`;
  }).join("");
  $("msg").textContent = !tools ? "" : list.length ? "" : q ? "Nichts gefunden." : "Hier liegt noch nichts.";
}

if (!A) {
  document.body.innerHTML = "";
} else {
  document.documentElement.style.setProperty("--h", A.hue);
  document.title = A.name;
  $("h").textContent = A.name;
  $("q").addEventListener("input", render);
  $("msg").textContent = "Lade …";
  load().then(d => { tools = d; render(); })
    .catch(() => { $("msg").textContent = "Konnte die Liste gerade nicht laden. Bitte später neu laden."; });
}
