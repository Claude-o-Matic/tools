// Übersicht: liest alle .html-Dateien aus den Bereichsordnern automatisch ein.
// Neuer Bereich = neue Zeile in CATS + gleichnamiger Ordner im Repo.
const REPO = "Claude-o-Matic/tools";
const CATS = [
  ["schule", "Schule"],
  ["zfsl", "ZfsL"],
  ["privat", "Privat"],
  ["m2", "M2"]
];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let tools = null;

async function load() {
  const key = "tools-cache", now = Date.now();
  try { const c = JSON.parse(localStorage.getItem(key)); if (c && now - c.t < 300000) return c.d; } catch (e) {}
  const r = await fetch(`https://api.github.com/repos/${REPO}/git/trees/HEAD?recursive=1`);
  if (!r.ok) throw new Error(r.status);
  const ids = CATS.map(c => c[0]).join("|");
  const re = new RegExp(`^(${ids})/(?:([^/]+)/index\\.html|([^/]+)\\.html)$`);
  const files = (await r.json()).tree.map(f => f.path.match(re)).filter(Boolean);
  const d = await Promise.all(files.map(async m => {
    const path = m[0], name = m[2] || m[3];
    let title = name.replace(/[-_]+/g, " "), desc = "";
    try {
      const doc = new DOMParser().parseFromString(await (await fetch(path)).text(), "text/html");
      title = doc.title.trim() || title;
      desc = doc.querySelector('meta[name="description"]')?.content || "";
    } catch (e) {}
    return { cat: m[1], path, title, desc };
  }));
  d.sort((a, b) => a.title.localeCompare(b.title, "de"));
  try { localStorage.setItem(key, JSON.stringify({ t: now, d })); } catch (e) {}
  return d;
}

function render() {
  const cat = location.hash.slice(1), q = $("q").value.trim().toLowerCase();
  const cur = CATS.find(c => c[0] === cat);
  $("nav").innerHTML = CATS.map(c => `<a href="#${c[0]}"${c[0] === cat ? ' class="on"' : ""}>${c[1]}</a>`).join("");
  $("h").textContent = cur ? cur[1] : "Übersicht";
  document.title = (cur ? cur[1] + " · " : "") + "Tools";
  $("msg").textContent = "";
  if (!tools) return;
  if (!cur && !q) {
    $("grid").innerHTML = CATS.map(c => {
      const n = tools.filter(t => t.cat === c[0]).length;
      return `<a class="card" href="#${c[0]}"><b>${c[1]}</b><span>${n} ${n === 1 ? "Tool" : "Tools"}</span></a>`;
    }).join("");
    return;
  }
  const list = tools.filter(t => (!cur || t.cat === cat) && (!q || (t.title + " " + t.desc).toLowerCase().includes(q)));
  $("grid").innerHTML = list.map(t => `<a class="card" href="${esc(t.path)}"><b>${esc(t.title)}</b><span>${esc(t.desc)}</span>${cur ? "" : `<i>${esc(CATS.find(c => c[0] === t.cat)[1])}</i>`}</a>`).join("");
  if (!list.length) $("msg").textContent = q ? "Nichts gefunden." : "Hier liegt noch nichts.";
}

addEventListener("hashchange", render);
$("q").addEventListener("input", render);
render();
$("msg").textContent = "Lade …";
load().then(d => { tools = d; render(); })
  .catch(() => { $("msg").textContent = "Konnte die Liste gerade nicht laden. Bitte später neu laden."; });
