// ====== GANTI DENGAN URL WEB APP DARI GOOGLE APPS SCRIPT KAMU ======
const API = "https://script.google.com/macros/s/AKfycbzMDhD3hHYEfyH09j6xkzXLmS4J6Ztq5h8839R6uRQPXEEylENjlDvq_g5EFviht5Y7eA/exec";
// ==================================================================

const $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let me = {}, off = 0, rnd = 0, stream = null, fil = "none", composedR = 0, chatN = -1, music = "", ready = 0, timer = null, first = true, gameOn = false, raf = 0;

const FIL = { Normal: "none", Vivid: "saturate(1.7) contrast(1.1)", Hangat: "sepia(.35) saturate(1.5) hue-rotate(-10deg)", Dingin: "saturate(1.3) hue-rotate(20deg) brightness(1.05)", "Hitam Putih": "grayscale(1) contrast(1.2)", Retro: "sepia(.6) contrast(1.1) saturate(1.4)", Mimpi: "brightness(1.1) saturate(1.5) hue-rotate(-20deg) blur(.5px)" };
// tema frame: [warna1, warna2, warna3, stiker]
const FR = [["#ff4d8d", "#ffd23f", "#2ec4b6", "🌟"], ["#7b5cff", "#3a86ff", "#ff9ecd", "💜"], ["#2ec4b6", "#ffd23f", "#ff6b35", "🍭"], ["#ff6b35", "#ff4d8d", "#7b5cff", "🎈"]];

async function api(p, body) {
  if (API.startsWith("PASTE")) throw new Error("URL Web App belum diisi di app.js");
  const r = await fetch(API + "?" + new URLSearchParams(p), body ? { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain" } } : {});
  return r.json();
}
const err = m => { $("#err").textContent = m || ""; };

/* ---------- Intro & scroll reveal & stiker interaktif ---------- */
setTimeout(() => { document.body.classList.remove("lock"); $("#intro").remove(); }, 3000);
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: .15 });
document.querySelectorAll(".rv").forEach(e => io.observe(e));
addEventListener("pointermove", e => {
  const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
  document.querySelectorAll(".stk").forEach(s => { const d = +s.dataset.d; s.style.translate = `${x * d}px ${y * d}px`; });
}, { passive: true });
document.querySelectorAll(".stk").forEach(s => s.onclick = () => { s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); });

/* ---------- Masuk lobby ---------- */
function nm() { const n = $("#name").value.trim(); if (!n) { err("Isi nama dulu ya"); return null; } return n; }
async function doEnter(a, extra) {
  const n = nm(); if (!n) return; err(); 
  try {
    const r = await api({ a, name: n, ...extra });
    if (!r.ok) return err(r.err);
    me = { name: n, role: r.role, code: r.code };
    $("#entry").hidden = true; $("#lobby").hidden = false;
    $("#lcode").textContent = me.code;
    buildFilters(); startCam(); tick(); setInterval(tick, 1500);
    $("#lobby").scrollIntoView({ behavior: "smooth" });
  } catch (e) { err(e.message); }
}
$("#btnCreate").onclick = () => doEnter("create");
$("#btnJoin").onclick = () => { const c = $("#code").value.trim().toUpperCase(); if (!c) return err("Masukkan kode lobby"); doEnter("join", { code: c }); };
$("#lcode").onclick = () => { navigator.clipboard?.writeText(me.code); $("#lcode").classList.add("ok"); setTimeout(() => $("#lcode").classList.remove("ok"), 900); };

/* ---------- Kamera & filter ---------- */
async function startCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
    $("#vid").srcObject = stream; $("#camMsg").hidden = true;
  } catch (e) { $("#camMsg").hidden = false; }
}
$("#camMsg").onclick = startCam;
function buildFilters() {
  $("#filters").innerHTML = Object.keys(FIL).map((k, i) => `<button class="chip${i ? "" : " on"}" data-f="${k}">${k}</button>`).join("");
  $("#filters").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("on")); b.classList.add("on");
    fil = FIL[b.dataset.f]; $("#vid").style.filter = fil;
  };
}

/* ---------- Polling status lobby ---------- */
async function tick() {
  try {
    const s = await api({ a: "state", code: me.code });
    if (!s.ok) return;
    off = s.now - Date.now();
    $("#p1").textContent = s.p1 || "…"; $("#p2").textContent = s.p2 || "Menunggu teman…";
    $("#p1").classList.toggle("on", !!s.r1); $("#p2").classList.toggle("on", !!s.r2);
    $("#btnReady").disabled = !(stream && s.p1 && s.p2);
    if (s.chat.length !== chatN) {
      chatN = s.chat.length;
      $("#chatlog").innerHTML = s.chat.map(c => `<p><b>${esc(c.n)}</b> ${esc(c.m)}</p>`).join("");
      $("#chatlog").scrollTop = 1e9;
    }
    if (s.music !== music) { music = s.music; setMusic(music); }
    if (first) { first = false; rnd = composedR = s.round; return; }
    if (s.round > rnd) { rnd = s.round; ready = 0; upReady(); startCd(s.startAt); }
    if (rnd > composedR && s.photos[1] && s.photos[2]) { composedR = rnd; compose(s.photos[1], s.photos[2]); }
  } catch (e) { }
}

/* ---------- Ready, hitung mundur, jepret ---------- */
function upReady() { $("#btnReady").textContent = ready ? "Batal siap" : "Aku siap! 📸"; $("#btnReady").classList.toggle("go", !!ready); }
$("#btnReady").onclick = async () => { ready = ready ? 0 : 1; upReady(); await api({ a: "ready", code: me.code, role: me.role, val: ready }); tick(); };
function startCd(t) {
  clearInterval(timer); $("#result").hidden = true;
  timer = setInterval(() => {
    const l = t - (Date.now() + off), cd = $("#cd");
    if (l > 0) { const n = Math.ceil(l / 1000); if (cd.textContent != n) { cd.textContent = n; cd.classList.remove("show"); void cd.offsetWidth; } cd.classList.add("show"); }
    else { clearInterval(timer); cd.textContent = "📸"; snap(); $("#flash").classList.add("fl"); setTimeout(() => { cd.classList.remove("show"); $("#flash").classList.remove("fl"); }, 700); }
  }, 100);
}
function snap() {
  const v = $("#vid"), c = document.createElement("canvas"), x = c.getContext("2d");
  c.width = 240; c.height = 180;
  const sw = Math.min(v.videoWidth, v.videoHeight * 4 / 3), sh = sw * 3 / 4;
  x.filter = fil; x.translate(240, 0); x.scale(-1, 1);
  x.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, 240, 180);
  api({ a: "photo", code: me.code, r: rnd, role: me.role }, { data: c.toDataURL("image/jpeg", .6) });
}

/* ---------- Hasil foto bertema ---------- */
const img = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
async function compose(a, b) {
  const [A, B] = [await img(a), await img(b)], f = FR[rnd % FR.length], c = $("#out"), x = c.getContext("2d");
  c.width = 780; c.height = 600;
  const g = x.createLinearGradient(0, 0, 780, 600); g.addColorStop(0, f[0]); g.addColorStop(.55, f[1]); g.addColorStop(1, f[2]);
  x.fillStyle = g; x.fillRect(0, 0, 780, 600);
  let sd = rnd * 9301 + 49297; const rn = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 70; i++) { x.fillStyle = `hsla(${rn() * 360},90%,65%,.55)`; x.save(); x.translate(rn() * 780, rn() * 600); x.rotate(rn() * 6); i % 2 ? x.fillRect(0, 0, 14, 8) : (x.beginPath(), x.arc(0, 0, 6, 0, 7), x.fill()); x.restore(); }
  x.textAlign = "center"; x.fillStyle = "#fff"; x.font = "700 46px Fredoka,sans-serif"; x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 8;
  x.fillText("SNAPBOX " + f[3], 390, 68);
  [[A, 40, -4, $("#p1").textContent], [B, 410, 4, $("#p2").textContent]].forEach(([im, px, rot, name]) => {
    x.save(); x.translate(px + 165, 340); x.rotate(rot * Math.PI / 180); x.shadowColor = "rgba(0,0,0,.3)"; x.shadowBlur = 18;
    x.fillStyle = "#fff"; x.fillRect(-165, -215, 330, 410); x.shadowBlur = 0;
    x.drawImage(im, -145, -195, 290, 217);
    x.fillStyle = f[0]; x.fillRect(-145, 30, 290, 6); x.fillStyle = "#1d1b3a"; x.font = "600 30px Fredoka,sans-serif"; x.fillText(name, 0, 90); x.font = "28px serif"; x.fillText(f[3], 0, 135);
    x.restore();
  });
  x.shadowBlur = 0; x.fillStyle = "#fff"; x.font = "500 20px Fredoka,sans-serif"; x.fillText(new Date().toLocaleDateString("id-ID", { dateStyle: "long" }) + " • lobby " + me.code, 390, 580);
  $("#dl").href = c.toDataURL("image/png"); $("#result").hidden = false;
  $("#result").scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- Chat ---------- */
async function sendChat() {
  const m = $("#chatin").value.trim(); if (!m) return; $("#chatin").value = "";
  $("#chatlog").insertAdjacentHTML("beforeend", `<p><b>${esc(me.name)}</b> ${esc(m)}</p>`); $("#chatlog").scrollTop = 1e9;
  await api({ a: "chat", code: me.code, name: me.name, msg: m });
}
$("#chatsend").onclick = sendChat; $("#chatin").onkeydown = e => e.key === "Enter" && sendChat();

/* ---------- Musik Spotify (link share) ---------- */
function setMusic(u) {
  const m = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|episode|artist)\/([A-Za-z0-9]+)/.exec(u || "");
  $("#mframe").innerHTML = m ? `<iframe src="https://open.spotify.com/embed/${m[1]}/${m[2]}" height="152" allow="autoplay; encrypted-media; clipboard-write" loading="lazy"></iframe>` : "";
}
$("#mset").onclick = async () => {
  const u = $("#murl").value.trim(); if (!/spotify/.test(u)) return $("#murl").placeholder = "Link Spotify tidak valid";
  music = u; setMusic(u); await api({ a: "music", code: me.code, url: u });
};

/* ---------- Mini game: pecahkan bintang dengan gerakan ---------- */
const mc = document.createElement("canvas"); mc.width = 32; mc.height = 24;
const mx = mc.getContext("2d", { willReadFrequently: true });
$("#btnGame").onclick = () => {
  gameOn = !gameOn; $("#btnGame").classList.toggle("go", gameOn);
  $("#btnGame").textContent = gameOn ? "Game: ON 🎮" : "Game: OFF 🎮";
  const fx = $("#fx"); fx.getContext("2d").clearRect(0, 0, 320, 240);
  cancelAnimationFrame(raf); if (gameOn) { score = 0; items = []; loop(0); }
};
let items = [], prev = null, score = 0, lastM = 0, lastS = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  const v = $("#vid"), f = $("#fx").getContext("2d");
  if (t - lastS > 650) { lastS = t; items.push({ x: 20 + Math.random() * 280, y: -20, e: ["⭐", "🍭", "🎈", "💖", "🍬"][Math.random() * 5 | 0], p: 0 }); }
  let mot = null;
  if (t - lastM > 66 && v.videoWidth) {
    lastM = t; mx.save(); mx.translate(32, 0); mx.scale(-1, 1); mx.drawImage(v, 0, 0, 32, 24); mx.restore();
    const d = mx.getImageData(0, 0, 32, 24).data; mot = new Uint8Array(768);
    if (prev) for (let i = 0; i < 768; i++) { const k = i * 4; mot[i] = Math.abs(d[k] - prev[k]) + Math.abs(d[k + 1] - prev[k + 1]) + Math.abs(d[k + 2] - prev[k + 2]) > 90 ? 1 : 0; }
    prev = d;
  }
  f.clearRect(0, 0, 320, 240); f.font = "28px serif"; f.textAlign = "center";
  items = items.filter(it => {
    if (it.p) { it.p++; f.globalAlpha = 1 - it.p / 10; f.font = `${28 + it.p * 4}px serif`; f.fillText("✨", it.x, it.y); f.globalAlpha = 1; return it.p < 10; }
    it.y += 1.6; f.font = "28px serif"; f.fillText(it.e, it.x, it.y);
    if (mot) { const cx = it.x / 10 | 0, cy = it.y / 10 | 0; let n = 0; for (let a = -1; a <= 1; a++)for (let b = -1; b <= 1; b++) { const X = cx + a, Y = cy + b; if (X >= 0 && X < 32 && Y >= 0 && Y < 24) n += mot[Y * 32 + X]; } if (n >= 3) { it.p = 1; score++; $("#score").textContent = score; } }
    return it.y < 260;
  });
}
