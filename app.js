/* ============================================================
   SLOVKO — herní logika
   ============================================================ */
"use strict";

/* ---------- pomocné funkce ---------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const rnd = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[randi(0, arr.length - 1)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randi(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function norm(s) {
  return (s || "").toLowerCase().replace(/[\s.,!?'"()\-–—:;!¿¡]+/g, "");
}
function stripAcc(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function isSame(a, b) {
  return norm(a) === norm(b) || stripAcc(norm(a)) === stripAcc(norm(b));
}
function dateStr(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d);
}
function el(tag, props, children) {
  const e = document.createElement(tag);
  if (props) {
    for (const k in props) {
      if (k === "class") e.className = props[k];
      else if (k === "style") e.style.cssText = props[k];
      else if (k === "text") e.textContent = props[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), props[k]);
      else if (k === "html") e.innerHTML = props[k];
      else e.setAttribute(k, props[k]);
    }
  }
  const kids = children == null ? [] : (Array.isArray(children) ? children : [children]);
  kids.forEach(c => {
    if (c == null) return;
    if (typeof c === "string" || typeof c === "number") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

/* ---------- úroveň / XP ---------- */
function levelInfo(xp) {
  let level = 1, rem = xp, need = 80;
  while (rem >= need) { rem -= need; level++; need = 80 + (level - 1) * 40; }
  return { level, into: rem, need, name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] };
}

/* ---------- zvuky (Web Audio) ---------- */
const Sound = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    const c = ac();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(vol || 0.18, c.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  }
  return {
    init() { ac(); },
    click() { tone(700, 0, 0.06, "triangle", 0.1); },
    correct(combo) {
      const base = 440 * Math.pow(2, Math.min(combo - 1, 12) / 12);
      tone(base, 0, 0.12, "triangle", 0.16);
      tone(base * 1.26, 0.09, 0.16, "triangle", 0.16);
      if (combo % 5 === 0) tone(base * 1.5, 0.18, 0.18, "triangle", 0.14);
    },
    wrong() { tone(180, 0, 0.22, "square", 0.1); tone(130, 0.12, 0.28, "square", 0.1); },
    heart() { tone(660, 0, 0.1, "sine", 0.14); tone(880, 0.08, 0.16, "sine", 0.14); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, "triangle", 0.17)); },
    levelup() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.2, "triangle", 0.16)); },
    fail() { [400, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.22, "sawtooth", 0.09)); }
  };
})();

/* ---------- konfety ---------- */
const Confetti = (() => {
  const cv = $("#confetti");
  const cx = cv.getContext("2d");
  let parts = [], running = false;
  const COLORS = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#6c5ce7", "#fd79a8", "#fbc531"];
  function resize() { cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener("resize", resize); resize();
  function burst(n) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x: innerWidth / 2 + rnd(-80, 80), y: innerHeight * 0.35 + rnd(-40, 40),
        vx: rnd(-6, 6), vy: rnd(-12, -3),
        w: rnd(6, 12), h: rnd(8, 16),
        rot: rnd(0, Math.PI * 2), vr: rnd(-0.3, 0.3),
        color: pick(COLORS), life: 1
      });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 20);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.99; p.rot += p.vr; p.life -= 0.012;
      cx.save();
      cx.translate(p.x, p.y); cx.rotate(p.rot);
      cx.globalAlpha = Math.max(p.life, 0);
      cx.fillStyle = p.color;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cx.restore();
    });
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }
  return { burst };
})();

/* ---------- pozadí hudba (procedurální skladba, ~100 s) ---------- */
const Music = (() => {
  let ctx = null, timer = null, on = false, startTime = 0, nextStep = 0, noiseBuf = null, master = null;
  const TICK = 0.15;          /* šestnáctina @ 100 BPM */
  const TOTAL = 256;          /* 16 taktů × 16 kroků */
  const ROOTS = [45, 41, 48, 43];   /* Am F C G */
  const TRIADS = { 45:[57,60,64], 41:[53,57,60], 48:[55,60,64], 43:[55,59,62] };
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function out(g) { g.connect(master); }
  function duck(v) {
    if (!master) return;
    const t = master.context.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(v, t + 0.25);
  }

  /* melodie — 8 taktů (sloka) */
  const MEL = [
    [0,64,4],[4,69,4],[8,72,4],[12,71,4],
    [16,69,4],[20,72,4],[24,69,4],[28,67,4],
    [32,74,4],[36,74,2],[38,72,2],[40,72,4],[44,67,4],
    [48,71,4],[52,74,4],[56,71,4],[60,67,4],
    [64,72,4],[68,71,4],[72,69,4],[76,64,4],
    [80,67,4],[84,69,4],[88,72,4],[92,69,4],
    [96,74,4],[100,72,4],[104,76,4],[108,74,4],
    [112,71,4],[116,69,4],[120,67,4],[124,71,4]
  ];
  /* variace pro refrén (takt 8–13) */
  const MEL2 = [
    [128,72,2],[130,71,2],[132,69,4],[136,72,4],[140,76,4],[144,74,2],[146,72,2],[148,71,4],
    [152,69,4],[156,72,4],[160,67,4],[164,69,4],[168,72,4],[172,74,4],
    [176,76,4],[180,74,4],[184,72,4],[188,69,4],
    [192,72,4],[196,74,4],[200,72,4],[204,69,4],
    [208,76,4],[212,74,4],[216,72,4],[220,74,4],
    [224,71,4],[228,72,4],[232,74,4],[236,72,4],
    [240,76,4],[244,74,4],[248,72,4],[252,71,8]
  ];

  function noise(ctx, len) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function env(c, t, vol, dur, filt) {
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = g;
    if (filt) {
      const f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = filt;
      node.connect(f); f.connect(g);
      return f;
    }
    return node;
  }
  function playVoice(e, t) {
    const c = ac();
    const kind = e[7];
    if (kind === "kick") {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); out(g);
      o.start(t); o.stop(t + 0.2);
    } else if (kind === "clap") {
      const s = c.createBufferSource(); s.buffer = noise(c, 0.15);
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.8;
      const g = c.createGain();
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      s.connect(f); f.connect(g); out(g);
      s.start(t); s.stop(t + 0.15);
    } else if (kind === "hat") {
      const s = c.createBufferSource(); s.buffer = noise(c, 0.05);
      const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6500;
      const g = c.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      s.connect(f); f.connect(g); out(g);
      s.start(t); s.stop(t + 0.06);
    } else {
      const o = c.createOscillator(), g = c.createGain();
      o.type = kind === "mel" ? "triangle" : (kind === "bass" ? "triangle" : "sine");
      o.frequency.value = e[2];
      const dur = e[5];
      if (kind === "pad") {
        const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700; f.Q.value = 0.4;
        o.connect(f); f.connect(g);
      } else o.connect(g);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(e[3], t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out(g);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  const events = (() => {
    const ev = [];
    for (let bar = 0; bar < 16; bar++) {
      const base = bar * 16;
      const root = ROOTS[bar % 4];
      const tri = TRIADS[root];
      const chorus = bar >= 8 && bar < 14;
      const body = bar >= 2 && bar < 14;
      /* pad */
      tri.forEach(n => ev.push([base, 0.03, midi(n), 0.045, "sine", 6.4, 700, "pad"]));
      if (bar >= 14) ev.push([base + 8, 0.03, midi(tri[0]), 0.04, "sine", 4, 700, "pad"]);
      /* basa */
      if (body) {
        ev.push([base + 0, 0.02, midi(root - 12), 0.08, "triangle", 1.4, 350, "bass"]);
        ev.push([base + 8, 0.02, midi(root - 12), 0.08, "triangle", 1.4, 350, "bass"]);
        ev.push([base + 12, 0.02, midi(root - 7), 0.05, "triangle", 0.8, 350, "bass"]);
      }
      /* bubny */
      if (bar >= 2 && bar < 15) {
        ev.push([base + 0, 0, 0, 0, 0, 0, 0, "kick"]);
        ev.push([base + 8, 0, 0, 0, 0, 0, 0, "kick"]);
      }
      if (bar >= 4 && bar < 14) {
        ev.push([base + 4, 0, 0, 0, 0, 0, 0, "clap"]);
        ev.push([base + 12, 0, 0, 0, 0, 0, 0, "clap"]);
      }
      if (bar >= 3 && bar < 15) {
        for (let s = 2; s < 16; s += 2) ev.push([base + s, 0, 0, 0, 0, 0, 0, "hat"]);
      }
      /* melodie */
      const mel = bar < 8 ? MEL : MEL2;
      for (const m of mel) {
        if (m[0] >= base && m[0] < base + 16) ev.push([m[0], 0.02, midi(m[1]), 0.09, "mel", m[2] * TICK, 0, "mel"]);
      }
    }
    ev.sort((a, b) => a[0] - b[0]);
    return ev;
  })();

  function schedule() {
    if (!on) return;
    const c = ac();
    const ahead = c.currentTime - startTime + 0.5;
    while (nextStep < TOTAL && nextStep * TICK < ahead) {
      const t = startTime + nextStep * TICK;
      for (const e of events) {
        if (e[0] === nextStep) { try { playVoice(e, t); } catch (err) {} }
        else if (e[0] > nextStep) break;
      }
      nextStep++;
    }
    if (nextStep >= TOTAL && c.currentTime - startTime > TOTAL * TICK - 0.2) {
      startTime = c.currentTime + 0.1;
      nextStep = 0;
    }
  }
  function start() {
    if (on) return;
    on = true;
    try {
      ac();
      startTime = ctx.currentTime + 0.1;
      nextStep = 0;
      if (timer) clearInterval(timer);
      timer = setInterval(schedule, 120);
    } catch (e) { on = false; }
  }
  function stop() {
    on = false;
    if (timer) { clearInterval(timer); timer = null; }
  }
  function toggle() {
    if (on) { stop(); return false; }
    start(); return true;
  }
  return { start, stop, toggle, duck, get on() { return on; } };
})();

/* ---------- TTS výslovnost ---------- */
const Speak = (() => {
  let voices = [];
  function refreshVoices() {
    try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; }
    return voices;
  }
  function init() {
    if (!("speechSynthesis" in window)) return;
    refreshVoices();
    try { speechSynthesis.onvoiceschanged = refreshVoices; } catch (e) {}
  }
  function warm() {
    if (!("speechSynthesis" in window)) return;
    try {
      refreshVoices();
      if (speechSynthesis.paused) speechSynthesis.resume();
      if (voices.length === 0) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0; u.rate = 3;
        speechSynthesis.speak(u);
      }
    } catch (e) {}
  }
  function say(text, lang, onDone) {
    if (!("speechSynthesis" in window)) { if (onDone) onDone(false); return false; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "ja-JP";
      u.rate = 0.85; u.pitch = 1.05; u.volume = 1;
      refreshVoices();
      const want = (lang || "ja-JP").toLowerCase();
      const v = voices.find(v => (v.lang || "").toLowerCase() === want) || voices[0];
      if (v) u.voice = v;
      let settled = false;
      u.onerror = () => { if (!settled) { settled = true; if (onDone) onDone(false); } };
      u.onend = () => { if (!settled) { settled = true; if (onDone) onDone(true); } };
      if (speechSynthesis.paused) speechSynthesis.resume();
      speechSynthesis.speak(u);
      return true;
    } catch (e) { if (onDone) onDone(false); return false; }
  }
  return { init, say, warm, refreshVoices };
})();

/* přehraje slovo + při selhání TTS ukáže foneticky (watchdog) */
function playWord(text, lang, btn) {
  let done = false;
  const finish = (ok) => {
    if (done) return; done = true;
    if (btn) btn.classList.remove("speaking");
    if (!ok) toast("🔊 Výslovnost: " + text);
  };
  const ok = Speak.say(text, lang, finish);
  if (btn) btn.classList.add("speaking");
  if (!ok) finish(false);
  setTimeout(() => finish(false), 4000);
}

/* ---------- rozpoznávání řeči (výslovnost) ---------- */
const Recog = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const available = !!SR;
  let current = null;
  function listen(lang, onResult, onEnd) {
    if (!SR) return false;
    try {
      if (current) { try { current.abort(); } catch (e) {} }
      const r = new SR();
      current = r;
      r.lang = lang;
      r.interimResults = false;
      r.maxAlternatives = 3;
      r.onresult = (e) => {
        const texts = [];
        for (let i = 0; i < e.results.length; i++) texts.push(e.results[i][0].transcript);
        onResult(texts);
      };
      r.onerror = (e) => { try { r.stop(); } catch (x) {} onEnd && onEnd(e.error); };
      r.onend = () => { current = null; };
      r.start();
      return true;
    } catch (e) { return false; }
  }
  function stop() { if (current) { try { current.stop(); } catch (e) {} } current = null; }
  function match(transcripts, w, lang) {
    const exRomaji = norm(w.romaji);
    const exKana = norm(w.ja);
    const exText = norm(w[lang]);
    for (const t0 of transcripts) {
      const t = norm(t0);
      if (!t) continue;
      if (t === exKana || t === exRomaji || t === exText) return true;
      if (t.indexOf(exKana) !== -1 || t.indexOf(exRomaji) !== -1) return true;
      if (t.split(/\s+/).indexOf(exRomaji) !== -1 || t.split(/\s+/).indexOf(exText) !== -1) return true;
    }
    return false;
  }
  return { available, listen, stop, match };
})();

/* ---------- žebříček (MantleDB — bez registrace) ---------- */
const LB = {
  URL: "https://mantledb.sh/v2/slovko-lb/scores",
  syncing: false,
  async sync() {
    if (!navigator.onLine || this.syncing) return null;
    this.syncing = true;
    try {
      let scores = [];
      try {
        const r = await fetch(this.URL, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d)) scores = d;
        }
      } catch (e) {}
      const name = (state.user || state.playerName || "Hráč").slice(0, 16);
      const li = levelInfo(state.xp);
      const me = { name, lang: state.lang, xp: state.xp, level: li.level, streak: state.streak, ts: Date.now() };
      scores = scores.filter(s => !(s && s.name === me.name));
      scores.push(me);
      scores.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      scores = scores.slice(0, 50);
      const r2 = await fetch(this.URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scores)
      });
      if (!r2.ok) return null;
      state.lbSync++;
      save();
      checkAchievements();
      return scores;
    } catch (e) {
      return null;
    } finally {
      this.syncing = false;
    }
  },
  async fetch() {
    try {
      const r = await fetch(this.URL, { cache: "no-store" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }
};

/* ---------- účet (jméno + heslo, stay signed) ---------- */
const Auth = {
  URL: "https://mantledb.sh/v2/slovko-acc/u/",
  async hash(pass, salt) {
    const data = salt + "|" + pass + "|slovko";
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    let h = 5381;
    for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  },
  randSalt() { return Math.random().toString(36).slice(2) + Date.now().toString(36); },
  async fetchAcc(name) {
    try {
      const r = await fetch(this.URL + encodeURIComponent(name), { cache: "no-store" });
      if (!r.ok) return null;
      const d = await r.json();
      return d && d.h ? d : null;
    } catch (e) { return null; }
  },
  async register(name, pass) {
    name = (name || "").trim().slice(0, 16);
    if (!name || !pass) return { ok: false, msg: "Zadej jméno i heslo." };
    if (await this.fetchAcc(name)) return { ok: false, msg: "Tohle jméno už někdo používá." };
    const salt = this.randSalt();
    const h = await this.hash(pass, salt);
    try {
      const r = await fetch(this.URL + encodeURIComponent(name), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ h, salt, ts: Date.now() })
      });
      if (!r.ok) return { ok: false, msg: "Server účet nepřijal. Zkus to znovu." };
    } catch (e) { return { ok: false, msg: "Jsi offline. Hraj jako host." }; }
    return { ok: true, name };
  },
  async login(name, pass) {
    name = (name || "").trim().slice(0, 16);
    if (!name || !pass) return { ok: false, msg: "Zadej jméno i heslo." };
    const acc = await this.fetchAcc(name);
    if (!acc) return { ok: false, msg: "Účet neexistuje. Vytvoř si ho." };
    const h = await this.hash(pass, acc.salt);
    if (h !== acc.h) return { ok: false, msg: "Špatné heslo." };
    return { ok: true, name };
  },
  signedIn() { return !!state.user; },
  showLogin() {
    if (this.signedIn() || $("#loginOverlay")) return;
    const ov = el("div", { id: "loginOverlay", class: "login-overlay" });
    const err = el("div", { class: "login-err" });
    const stayChk = el("input", { type: "checkbox", id: "stayCheck", checked: "checked" });
    const nameInp = el("input", { class: "name-input", type: "text", placeholder: "Jméno", maxlength: "16", autocomplete: "username" });
    const passInp = el("input", { class: "name-input", type: "password", placeholder: "Heslo", autocomplete: "current-password" });
    const setErr = (m) => { err.textContent = m || ""; };
    const finish = (name) => {
      state.user = name;
      state.stay = stayChk.checked;
      state.guest = false;
      save();
      ov.remove();
      renderTop();
      renderPath();
    };
    ov.appendChild(el("div", { class: "login-card" }, [
      el("div", { class: "login-owl", text: "🦉" }),
      el("h2", { text: "Slovko" }),
      el("div", { class: "sub", style: "margin-bottom:10px" }, "Přihlas se, ať ti nikdo neukradne jméno v žebříčku."),
      nameInp, passInp,
      el("label", { class: "login-stay" }, [stayChk, el("span", { text: " Zůstat přihlášen" })]),
      err,
      el("button", { class: "btn-big", text: "Přihlásit se", onclick: async () => {
        setErr("Čekám…"); Sound.init();
        const r = await Auth.login(nameInp.value, passInp.value);
        if (r.ok) { Sound.fanfare(); finish(r.name); } else { setErr(r.msg); Sound.wrong(); }
      } }),
      el("button", { class: "btn-big violet", text: "Vytvořit účet", onclick: async () => {
        setErr("Čekám…"); Sound.init();
        const r = await Auth.register(nameInp.value, passInp.value);
        if (r.ok) { Sound.fanfare(); finish(r.name); } else { setErr(r.msg); Sound.wrong(); }
      } }),
      el("button", { class: "btn-big ghost", text: "Hrát jako host", onclick: () => {
        Sound.click();
        state.user = "Hráč" + randi(100, 999);
        state.guest = true; state.stay = false;
        save();
        ov.remove(); renderTop(); renderPath();
      } })
    ]));
    document.body.appendChild(ov);
  }
};

/* ---------- stav ---------- */
const KEY = "slovko_v1";
const DEFAULTS = {
  xp: 0, streak: 0, bestStreak: 0, lastPlay: null,
  hearts: 5, heartsRegenAt: 0,
  lang: "ja", dailyGoal: 50, dailyXp: 0, dailyDate: dateStr(),
  lessons: 0, perfectLessons: 0, maxCombo: 0, langsTried: {},
  mastery: {}, unitDone: {}, unlocked: {},
  achievements: {},
  playerName: "", music: true,
  lbSync: 0, speakCount: 0, listenCount: 0,
  user: "", stay: false, guest: false,
  dailyWord: "", dailyWordDate: "", aiLang: ""
};
let state;
function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
  } catch (e) { state = Object.assign({}, DEFAULTS); }
  if (state.dailyDate !== dateStr()) { state.dailyDate = dateStr(); state.dailyXp = 0; }
  catchUpHearts();
  ensureUnlocks();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
function ensureUnlocks() {
  const l = state.lang;
  if (!state.unlocked[l]) state.unlocked[l] = [UNITS[0].id];
}
function catchUpHearts() {
  if (state.hearts >= 5) return;
  const now = Date.now();
  while (state.hearts < 5 && state.heartsRegenAt && now >= state.heartsRegenAt) {
    state.hearts++;
    state.heartsRegenAt += 30 * 60 * 1000;
  }
  if (state.hearts >= 5) state.heartsRegenAt = 0;
}

/* mastery */
function getMastery(wid) { return (state.mastery[state.lang] || {})[wid] || 0; }
function setMastery(wid, v) {
  state.mastery[state.lang] = state.mastery[state.lang] || {};
  state.mastery[state.lang][wid] = Math.max(0, Math.min(5, v));
}
function unitIsDone(uid) { return !!(state.unitDone[state.lang] || {})[uid]; }
function unitUnlocked(uid) {
  const list = state.unlocked[state.lang] || [];
  if (list.indexOf(uid) !== -1) return true;
  const i = UNITS.findIndex(u => u.id === uid);
  return i > 0 && unitIsDone(UNITS[i - 1].id);
}
function completeUnit(uid) {
  state.unitDone[state.lang] = state.unitDone[state.lang] || {};
  if (!state.unitDone[state.lang][uid]) {
    state.unitDone[state.lang][uid] = true;
    const i = UNITS.findIndex(u => u.id === uid);
    const next = UNITS[i + 1];
    if (next && state.unlocked[state.lang].indexOf(next.id) === -1) {
      state.unlocked[state.lang].push(next.id);
    }
  }
}

/* ---------- topbar ---------- */
function renderTop() {
  $("#streakVal").textContent = state.streak;
  $("#heartsVal").textContent = state.hearts;
  const li = levelInfo(state.xp);
  $("#xpVal").textContent = state.xp;
  $("#xpLevel").textContent = "Úr. " + li.level;
  $("#xpBarFill").style.width = (li.into / li.need * 100) + "%";
}

/* ---------- toast / flying xp ---------- */
function toast(html) {
  const t = el("div", { class: "toast", html });
  $("#toasts").appendChild(t);
  setTimeout(() => { t.classList.add("gone"); setTimeout(() => t.remove(), 320); }, 2600);
}
function flyXp(text) {
  const d = el("div", { class: "fly-xp", text });
  d.style.left = (innerWidth / 2 - 30) + "px";
  d.style.top = (innerHeight * 0.3) + "px";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

/* ---------- sova (maskot) ---------- */
const Mascot = (() => {
  const host = el("div", { id: "mascot" });
  const bubble = el("div", { class: "mascot-bubble" });
  const face = el("div", { class: "mascot-face", text: "🦉" });
  host.appendChild(bubble); host.appendChild(face);
  $("#app").appendChild(host);
  let t = null;
  let tapCb = null;
  function say(text, ms) {
    bubble.textContent = text;
    host.style.display = "flex";
    if (t) clearTimeout(t);
    if (ms) t = setTimeout(hide, ms);
  }
  function hide() { host.style.display = "none"; if (t) { clearTimeout(t); t = null; } }
  function mood(m) { face.textContent = m; }
  function onTap(cb) {
    tapCb = cb;
    host.classList.toggle("clickable", !!cb);
  }
  face.addEventListener("click", () => {
    Sound.init(); Sound.click();
    if (tapCb) tapCb();
  });
  return { say, hide, mood, onTap };
})();

/* ---------- navigace ---------- */
let currentView = "path";
function showView(name) {
  currentView = name;
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === name));
  if (name === "path") renderPath();
  else if (name === "ai") renderAI();
  else if (name === "achiev") renderAchievements();
  else if (name === "leaderboard") renderLeaderboard();
  else if (name === "profile") renderProfile();
  const v = $("#view"); v.scrollTop = 0;
  v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
}

/* jiskřivý klikový efekt */
function sparkle(x, y) {
  const emojis = ["✨", "⭐", "💫", "🌟"];
  for (let i = 0; i < 4; i++) {
    const s = el("span", { class: "sparkle", text: pick(emojis) });
    const ang = rnd(0, Math.PI * 2), dist = rnd(16, 42);
    s.style.left = (x + rnd(-5, 5)) + "px";
    s.style.top = (y + rnd(-5, 5)) + "px";
    s.style.setProperty("--sx", (Math.cos(ang) * dist) + "px");
    s.style.setProperty("--sy", (Math.sin(ang) * dist - 10) + "px");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
}
document.addEventListener("pointerdown", (e) => {
  if (e.target && e.target.closest && e.target.closest("button")) sparkle(e.clientX, e.clientY);
});
$("#logoBtn").addEventListener("click", () => { Sound.init(); Sound.click(); showView("path"); });
$("#xpBox").addEventListener("click", () => { Sound.click(); showView("profile"); });
$$(".nav-btn").forEach(b => b.addEventListener("click", () => { Sound.init(); Sound.click(); showView(b.dataset.nav); }));
$("#musicBtn").addEventListener("click", () => {
  Sound.init();
  state.music = Music.toggle();
  save();
  $("#musicBtn").classList.toggle("off", !state.music);
  $("#musicIco").textContent = state.music ? "🎵" : "🔇";
});

/* ---------- HLAVNÍ OBRAZOVKA (cesta) ---------- */
function renderPath() {
  const v = $("#view");
  v.innerHTML = "";
  const lang = LANGS[state.lang];

  v.appendChild(el("div", { class: "screen-head" },
    [ el("span", { class: "icon", text: lang.flag }),
      el("div", { class: "title", text: "Co se dnes naučíš?" }),
      el("button", { class: "speak-btn", text: "🔊", onclick: (e) => { Sound.init(); playWord(lang.native, lang.tts, e.currentTarget); } }) ]));

  /* výběr jazyka */
  const grid = el("div", { class: "lang-grid" });
  Object.keys(LANGS).forEach(code => {
    const l = LANGS[code];
    grid.appendChild(el("button", {
      class: "lang-card" + (code === state.lang ? " selected" : ""), onclick: () => {
        Sound.click(); state.lang = code; ensureUnlocks(); save(); renderPath(); renderTop();
      }
    }, [
      el("span", { class: "flag", text: l.flag }),
      el("span", { class: "name", text: l.name }),
      el("span", { class: "lang-sub", text: l.native })
    ]));
  });
  v.appendChild(grid);

  /* denní cíl */
  const goal = Math.min(state.dailyXp, state.dailyGoal);
  const goalPct = Math.round(goal / state.dailyGoal * 100);
  v.appendChild(el("div", { class: "card goal-box" }, [
    el("span", { class: "g-ico", text: goalPct >= 100 ? "🎯" : "🎁" }),
    el("div", { class: "goal-wrap" }, [
      el("div", { class: "sub", text: "Denní cíl: " + state.dailyXp + " / " + state.dailyGoal + " XP" }),
      el("div", { class: "goal-bar" }, [el("span", { style: "width:" + goalPct + "%" })])
    ])
  ]));

  /* cesta s jednotkami */
  const path = el("div", { class: "path" });
  UNITS.forEach((u, i) => {
    const done = unitIsDone(u.id);
    const unlocked = unitUnlocked(u.id);
    const mastered = u.words.filter(w => getMastery(w.id) >= 3).length;
    const node = el("div", { class: "unit-node" }, [
      el("div", { class: "connector" }),
      el("button", {
        class: "unit-btn" + (done ? " done" : "") + (unlocked ? "" : " locked"),
        onclick: () => {
          if (!unlocked) { Sound.init(); Sound.wrong(); toast("🔒 Dokonči předchozí jednotku!"); return; }
          Sound.init(); Sound.click();
          startLesson(u, "lesson");
        }
      }, [
        el("span", { class: "u-ico", text: unlocked ? u.ico : "🔒" }),
        el("div", { class: "u-info" }, [
          el("div", { class: "u-name", text: "Jednotka " + (i + 1) + " · " + u.name }),
          el("div", { class: "u-prog", text: mastered + " / " + u.words.length + " slov zvládnuto" })
        ]),
        el("div", { class: "u-stars", text: done ? "⭐ " + (u.words.length) + " slov" : (unlocked ? "▶ Start" : "Zamčeno") })
      ])
    ]);
    path.appendChild(node);
  });
  v.appendChild(path);

  /* denní slovo (gacha krabička) */
  const dw = WORD_BY_ID[state.dailyWord];
  const dwFresh = state.dailyWordDate === dateStr();
  v.appendChild(el("div", { class: "card goal-box", style: "cursor:pointer" }, [
    el("span", { class: "g-ico", text: "🎁" }),
    el("div", { class: "goal-wrap", style: "flex:1" }, [
      el("div", { class: "sub", text: "Denní slovo" }),
      el("div", { class: "sub", style: "color:var(--primary)" }, dwFresh && dw ? (lang.flag + " " + wordTarget(dw, state.lang).display) : "Otevři krabičku a získej slovo dne!")
    ]),
    el("button", { class: "btn-save", text: dwFresh ? "🔁 Zopakovat" : "🎁 Otevřít", onclick: () => { Sound.init(); openCrate(); } })
  ]));

  /* tréninky */
  const drill = el("div", { class: "drill-row" });
  drill.appendChild(el("button", { class: "drill-card blue", onclick: () => { Sound.init(); Sound.click(); startDrill("listen"); } },
    [ el("div", { class: "d-ico", text: "🎧" }), el("div", { class: "d-name", text: "Poslech" }), el("div", { class: "d-desc", text: "Trénuj ucho na " + lang.name })]));
  drill.appendChild(el("button", { class: "drill-card pink", onclick: () => { Sound.init(); Sound.click(); startDrill("speak"); } },
    [ el("div", { class: "d-ico", text: "🎤" }), el("div", { class: "d-name", text: "Výslovnost" }), el("div", { class: "d-desc", text: "Mluv a nech se poznat" })]));
  v.appendChild(drill);

  /* praxe pro obnovu srdcí */
  if (state.hearts < 5) {
    v.appendChild(el("div", { class: "card", style: "text-align:center" }, [
      el("div", { class: "sub", style: "margin-bottom:8px" }, "Srdce se obnovují (1 / 30 min) — nebo si procvičuj a získej hned ❤️"),
      el("button", { class: "btn-big violet", text: "🎯 Cvičení (získej ❤️)", onclick: () => { Sound.click(); startPractice(); } })
    ]));
  }
}

/* ---------- AI TRENÉR ---------- */
const AIChat = (() => {
  let messages = [];
  let busy = false;
  function reset(lang) {
    const l = LANGS[lang];
    messages = [
      { role: "system", content: "Jsi přátelský a trpělivý učitel jazyků. Žák se učí " + l.name + " (" + l.native + ") a mluví česky, je začátečník. Odpovídej KRÁTCE (max 3-4 věty), česky, a nauč ho něco užitečného: slovíčko, frázi nebo jednoduchou větu v " + l.name + " s výslovností v závorce. Vysvětluj jednoduše, opravuj chyby, chval, ptej se zpětně." },
      { role: "assistant", content: "Ahoj! 👋 Jsem tvůj AI trenér " + l.name + ". Můžeme si povídat, naučím tě slovíčka i fráze. Co zkusíme?" }
    ];
  }
  function history() { return messages; }
  async function send(text) {
    if (busy) return null;
    busy = true;
    messages.push({ role: "user", content: text });
    try {
      const r = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model: "openai" })
      });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      const reply = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (!reply) throw new Error("empty");
      messages.push({ role: "assistant", content: reply });
      busy = false;
      return reply;
    } catch (e) {
      busy = false;
      return null;
    }
  }
  return { reset, send, history, get busy() { return busy; } };
})();

function renderAI() {
  const v = $("#view");
  v.innerHTML = "";
  const aiLang = state.aiLang || state.lang;
  const lang = LANGS[aiLang];

  v.appendChild(el("div", { class: "screen-head" }, [
    el("span", { class: "icon", text: "🤖" }),
    el("div", { class: "title", text: "AI trenér" }),
    el("span", { class: "icon", text: lang.flag })
  ]));

  /* výběr jazyka pro AI */
  const chips = el("div", { class: "lang-grid", style: "margin-bottom:8px" });
  Object.keys(LANGS).forEach(code => {
    const l = LANGS[code];
    chips.appendChild(el("button", {
      class: "lang-card" + (code === aiLang ? " selected" : ""), onclick: () => {
        Sound.click();
        state.aiLang = code;
        save();
        AIChat.reset(code);
        renderAI();
      }
    }, [ el("span", { class: "flag", text: l.flag }), el("span", { class: "name", text: l.name }) ]));
  });
  v.appendChild(chips);

  /* rychlé volby */
  const quick = el("div", { class: "drill-row", style: "grid-template-columns:1fr 1fr" });
  const chipsQ = [
    ["🍎 Nauč mě 5 slovíček", "Nauč mě 5 užitečných slovíček v " + lang.name + " s výslovností."],
    ["💬 Povídej si se mnou", "Popovídej si se mnou jednoduše v " + lang.name + "."],
    ["🙋 Jak se představím", "Nauč mě, jak se představit v " + lang.name + "."],
    ["✏️ Oprav mě", "Řekni mi, jak se řekne: 'Já jít do obchod včera.'"]
  ];
  chipsQ.forEach(([label, q]) => {
    quick.appendChild(el("button", { class: "drill-card blue", style: "margin-bottom:0", onclick: () => { Sound.init(); sendAI(q); } },
      [ el("div", { class: "d-ico", text: label.split(" ")[0] }), el("div", { class: "d-name", text: label.split(" ").slice(1).join(" ") }) ]));
  });
  v.appendChild(quick);

  const chat = el("div", { class: "chat" });
  v.appendChild(chat);

  const inputRow = el("div", { class: "chat-input-row" });
  const inp = el("input", { class: "type-input", type: "text", placeholder: "Napiš nebo řekni…", style: "margin-top:0;text-align:left" });
  const micBtn = el("button", { class: "mic-btn", style: "width:48px;height:48px;font-size:20px", text: "🎤", title: "Mluvit", onclick: async () => {
    if (!Recog.available) { toast("🎤 Mikrofon není dostupný v tomto prohlížeči."); return; }
    Sound.init();
    micBtn.classList.add("listening"); micBtn.disabled = true;
    toast("🎤 Poslouchám… mluv " + lang.native);
    const ok = Recog.listen(lang.tts, (texts) => {
      micBtn.classList.remove("listening"); micBtn.disabled = false;
      if (texts && texts[0]) { inp.value = texts[0]; sendAI(inp.value); }
    }, () => { micBtn.classList.remove("listening"); micBtn.disabled = false; toast("Neslyšel jsem tě. Zkus znovu."); });
    if (!ok) { micBtn.classList.remove("listening"); micBtn.disabled = false; toast("🎤 Mikrofon selhal."); }
  } });
  const sendBtn = el("button", { class: "btn-save", text: "Odeslat", onclick: () => { const t = inp.value.trim(); if (t) { inp.value = ""; sendAI(t); } } });
  inputRow.appendChild(inp);
  inputRow.appendChild(micBtn);
  inputRow.appendChild(sendBtn);
  v.appendChild(inputRow);

  const onEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); const t = inp.value.trim(); if (t) { inp.value = ""; sendAI(t); } } };
  inp.addEventListener("keydown", onEnter);

  function addMsg(role, text) {
    const m = el("div", { class: "chat-msg " + role });
    if (role === "assistant") {
      m.appendChild(el("div", { class: "chat-bubble", text }));
      m.appendChild(el("button", { class: "speak-btn", style: "width:34px;height:34px;font-size:15px", text: "🔊", onclick: (ev) => { Sound.init(); playWord(text, lang.tts, ev.currentTarget); } }));
    } else {
      m.appendChild(el("div", { class: "chat-bubble", text }));
    }
    chat.appendChild(m);
    chat.scrollTop = chat.scrollHeight;
  }
  window.__aiChat = { addMsg, chat, v };
  if (AIChat.history().length === 0) AIChat.reset(aiLang);
  AIChat.history().forEach(m => { if (m.role !== "system") addMsg(m.role, m.content); });

  async function sendAI(text) {
    addMsg("user", text);
    const typing = el("div", { class: "chat-msg ai" }, [ el("div", { class: "chat-bubble typing", text: "🤖 píše…" }) ]);
    chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;
    const reply = await AIChat.send(text);
    typing.remove();
    if (reply) addMsg("assistant", reply);
    else addMsg("assistant", "Jsem teď offline… Zkus to prosím za chvíli nebo po připojení. 🙏");
  }
}
function achValue(track) {
  switch (track) {
    case "lessons": return state.lessons;
    case "maxCombo": return state.maxCombo;
    case "perfectLessons": return state.perfectLessons;
    case "langsTried": return Object.keys(state.langsTried).length;
    case "bestStreak": return state.bestStreak;
    case "mastered": {
      let c = 0; const m = state.mastery[state.lang] || {};
      Object.keys(m).forEach(k => { if (m[k] >= 5) c++; }); return c;
    }
    case "totalXp": return state.xp;
    case "lbSync": return state.lbSync;
    case "speakCount": return state.speakCount;
    case "listenCount": return state.listenCount;
  }
  return 0;
}
function renderAchievements() {
  const v = $("#view");
  v.innerHTML = "";
  v.appendChild(el("div", { class: "screen-head" }, [
    el("span", { class: "icon", text: "🏆" }),
    el("div", { class: "title", text: "Úspěchy" }),
    el("span", { class: "icon", text: "🏆" })
  ]));
  const unlockedCount = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
  v.appendChild(el("div", { class: "card", style: "text-align:center" }, [
    el("h2", { text: unlockedCount + " / " + ACHIEVEMENTS.length + " odemčeno" }),
    el("div", { class: "sub", text: "Sběrej všechny!" })
  ]));
  const grid = el("div", { class: "ach-grid" });
  ACHIEVEMENTS.forEach(a => {
    const val = achValue(a.track);
    const unlocked = !!state.achievements[a.id];
    grid.appendChild(el("div", {
      class: "ach" + (unlocked ? " unlocked" : "")
    }, [
      el("div", { class: "a-ico", text: unlocked ? a.ico : "🔒" }),
      el("div", { class: "a-name", text: a.name }),
      el("div", { class: "a-desc", text: a.desc }),
      el("div", { class: "a-prog", text: unlocked ? "✓ Odemčeno" : (Math.min(val, a.goal) + " / " + a.goal) })
    ]));
  });
  v.appendChild(grid);
}

/* ---------- ŽEBŘÍČEK ---------- */
function renderLeaderboard() {
  const v = $("#view");
  v.innerHTML = "";
  v.appendChild(el("div", { class: "screen-head" }, [
    el("span", { class: "icon", text: "🏆" }),
    el("div", { class: "title", text: "Žebříček" }),
    el("button", { class: "speak-btn", text: "🔄", onclick: () => { Sound.click(); renderLeaderboard(); } })
  ]));

  v.appendChild(el("div", { class: "card name-row", style: "justify-content:space-between" }, [
    el("div", { class: "lb-info" }, [
      el("div", { class: "lb-name", text: Auth.signedIn() ? state.user : (state.user || "Host") }),
      el("div", { class: "lb-sub", text: Auth.signedIn() ? "Přihlášen ✓ · jméno chráněno" : "Přihlas se, ať je tvoje jméno tvoje." })
    ]),
    Auth.signedIn()
      ? el("button", { class: "btn-save", style: "background:#ff5252;box-shadow:0 4px 0 #c0392b", text: "Odhlásit", onclick: () => { Sound.click(); state.user = ""; state.stay = false; state.guest = true; save(); renderLeaderboard(); } })
      : el("button", { class: "btn-save", text: "Přihlásit", onclick: () => { Sound.click(); Auth.showLogin(); } })
  ]));

  v.appendChild(el("div", { class: "lb-status", id: "lbStatus", text: "Načítám žebříček… 🌐" }));
  const list = el("div", { id: "lbList" });
  v.appendChild(list);

  (async () => {
    const scores = await LB.fetch();
    if (!scores || !scores.length) {
      $("#lbStatus").textContent = "Žebříček je zatím prázdný. Dokonči lekci a objevíš se tu! 🌍";
      return;
    }
    const name = (state.user || state.playerName || "Hráč").trim();
    let myIdx = -1;
    scores.forEach((s, i) => { if (s && s.name === name) myIdx = i; });
    list.innerHTML = "";
    scores.forEach((s, i) => {
      if (i >= 50) return;
      const rank = i + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      const lang = LANGS[s.lang] || LANGS.ja;
      const row = el("div", { class: "lb-row" + (s.name === name ? " me" : "") }, [
        el("div", { class: "lb-rank", text: medal }),
        el("span", { class: "lb-flag", text: lang.flag }),
        el("div", { class: "lb-info" }, [
          el("div", { class: "lb-name", text: s.name + (s.name === name ? " (ty)" : "") }),
          el("div", { class: "lb-sub", text: "Úroveň " + (s.level || 1) + " · 🔥" + (s.streak || 0) })
        ]),
        el("div", { class: "lb-xp", text: (s.xp || 0) + " XP" })
      ]);
      list.appendChild(row);
    });
    $("#lbStatus").textContent = myIdx >= 0
      ? "Tvoje pozice: " + (myIdx + 1) + ". místo z " + scores.length + " hráčů 🎉"
      : "Zatím nejsi v žebříčku. Dokonči lekci a zapoj se! 🚀";
  })();
}

/* ---------- PROFIL ---------- */
function renderProfile() {
  const v = $("#view");
  v.innerHTML = "";
  v.appendChild(el("div", { class: "screen-head" }, [
    el("span", { class: "icon", text: "🐼" }),
    el("div", { class: "title", text: "Tvůj profil" })
  ]));
  const li = levelInfo(state.xp);

  v.appendChild(el("div", { class: "card" }, [
    el("div", { class: "sub", style: "margin-bottom:8px" }, "Účet"),
    Auth.signedIn()
      ? el("div", { class: "name-row" }, [
          el("div", { class: "lb-info" }, [
            el("div", { class: "lb-name", text: "👤 " + state.user }),
            el("div", { class: "lb-sub", text: (state.stay ? "Zůstáváš přihlášen" : "Budeš se muset přihlásit") + " · jméno chráněno ✓" })
          ]),
          el("button", { class: "btn-save", style: "background:#ff5252;box-shadow:0 4px 0 #c0392b", text: "Odhlásit", onclick: () => {
            Sound.click(); state.user = ""; state.stay = false; state.guest = true; save(); renderProfile();
          } })
        ])
      : el("div", { class: "name-row" }, [
          el("div", { class: "lb-info" }, [
            el("div", { class: "lb-name", text: "🕹️ Hráš jako host: " + (state.user || "Host") }),
            el("div", { class: "lb-sub", text: "Přihlas se, ať ti nikdo neukradne jméno." })
          ]),
          el("button", { class: "btn-save", text: "Přihlásit", onclick: () => { Sound.click(); Auth.showLogin(); } })
        ])
  ]));
  v.appendChild(el("div", { class: "card", style: "text-align:center" }, [
    el("div", { class: "prof-avatar", text: "🦉" }),
    el("h2", { text: li.name }),
    el("div", { class: "sub", text: "Úroveň " + li.level + " · " + state.xp + " XP celkem" }),
    el("div", { class: "goal-bar", style: "margin-top:8px" }, [el("span", { style: "width:" + (li.into / li.need * 100) + "%" })]),
    el("div", { class: "sub", style: "margin-top:4px" }, (li.into + " / " + li.need + " XP do další úrovně"))
  ]));

  const list = el("div", { class: "stat-list" });
  const stats = [
    ["🔥 Den za sebou", state.streak],
    ["🏆 Nejlepší série", state.bestStreak],
    ["⚡ Nejvyšší kombo", state.maxCombo],
    ["📚 Dokončené lekce", state.lessons],
    ["💎 Perfektní lekce", state.perfectLessons],
    ["🌍 Jazyky vyzkoušeny", Object.keys(state.langsTried).length]
  ];
  stats.forEach(([k, val]) =>
    list.appendChild(el("div", { class: "stat-line" }, [el("span", { class: "k", text: k }), el("span", { class: "v", text: val })])));
  v.appendChild(list);

  v.appendChild(el("div", { class: "card" }, [
    el("h2", { text: "Pokrok v jazycích" }),
    Object.keys(LANGS).forEach(code => {
      const l = LANGS[code];
      const done = Object.keys(state.unitDone[code] || {}).length;
      const pct = Math.round(done / UNITS.length * 100);
      list.appendChild(el("div", { style: "margin-top:10px" }, [
        el("div", { class: "stat-line" }, [
          el("span", { class: "k", text: l.flag + " " + l.name }),
          el("span", { class: "v", text: done + " / " + UNITS.length + " jednotek" })
        ]),
        el("div", { class: "lang-prog-bar" }, [el("span", { style: "width:" + pct + "%" })])
      ]));
    })
  ]));
}

/* ============================================================
   LEKCE
   ============================================================ */
const Q_LEN = 8;
let lesson = null;
let questionState = null;

function wordTarget(w, lang) {
  if (lang === "ja") return { display: w.ja, sub: w.romaji };
  return { display: w[lang], sub: "" };
}
function promptLang() { return state.lang === "cs" ? "en" : "cs"; }

/* vyber slova pro lekci — preferuj málo zvládnutá */
function buildPool(unit, count) {
  let pool = unit.words.slice();
  const scored = pool.map(w => ({ w, m: getMastery(w.id) }));
  scored.sort((a, b) => a.m - b.m);
  pool = scored.map(s => s.w);
  return pool.slice(0, count);
}

function otherLabels(w, lang, count, excl) {
  const unit = UNITS.find(u => u.id === w.cat);
  const cands = shuffle(unit.words.filter(x => x.id !== w.id));
  const out = [];
  const seen = new Set([excl]);
  for (const c of cands) {
    const lab = wordTarget(c, lang).display;
    if (!seen.has(lab)) { seen.add(lab); out.push(c); }
    if (out.length >= count) break;
  }
  while (out.length < count) {
    const c = pick(ALL_WORDS.filter(x => x.id !== w.id));
    const lab = wordTarget(c, lang).display;
    if (!seen.has(lab)) { seen.add(lab); out.push(c); }
  }
  return out;
}

function makeQuestion(w, lang) {
  const pL = promptLang();
  const unit = UNITS.find(u => u.id === w.cat);
  const isKana = !!(unit && unit.kana);
  const noType = !!(unit && unit.noType);
  let types;
  if (isKana) types = ["choice", "reverse", "type"];
  else {
    types = ["choice", "reverse", "listening", "listentype", "truefalse"];
    if (!noType) types.push("type");
    types.push("speak");
  }
  const type = pick(types);
  const q = { w, lang, type };
  const target = wordTarget(w, lang);

  if (type === "choice") {
    const correct = target.display;
    const others = otherLabels(w, lang, 3, correct).map(o => wordTarget(o, lang).display);
    q.prompt = "Jak se řekne v " + LANGS[lang].name + "?";
    q.word = w[pL];
    q.reading = "";
    q.options = shuffle([correct].concat(others));
    q.correct = correct;
  } else if (type === "reverse") {
    const correct = w[pL];
    const others = shuffle(w.cat ? UNITS.find(u => u.id === w.cat).words.filter(x => x.id !== w.id).map(x => x[pL])
      : []).filter(x => x !== correct).slice(0, 3);
    q.prompt = "Co znamená:";
    q.word = target.display;
    q.reading = target.sub;
    q.options = shuffle([correct].concat(others));
    q.correct = correct;
  } else if (type === "type") {
    q.prompt = "Napiš v " + LANGS[lang].name + ":";
    q.word = w[pL];
    q.reading = "";
    q.options = [];
    q.correct = null;
  } else if (type === "listening") {
    const correct = w[pL];
    const others = shuffle(UNITS.find(u => u.id === w.cat).words.filter(x => x.id !== w.id).map(x => x[pL]))
      .filter(x => x !== correct).slice(0, 3);
    q.prompt = "Poslouchej a vyber, co slyšíš:";
    q.word = "";
    q.reading = "";
    q.say = target.display;
    q.options = shuffle([correct].concat(others));
    q.correct = correct;
  } else if (type === "listentype") {
    q.prompt = "Poslouchej a napiš, co slyšíš:";
    q.word = "";
    q.reading = "";
    q.say = target.display;
    q.options = [];
    q.correct = null;
  } else if (type === "speak") {
    q.prompt = "Vyslov nahlas:";
    q.word = target.display;
    q.reading = target.sub;
    q.say = target.display;
    q.options = [];
    q.correct = q.lang === "ja" ? q.w.romaji : q.w[q.lang];
  } else if (type === "truefalse") {
    const isTrue = Math.random() < 0.5;
    const other = isTrue ? w : pick(UNITS.find(u => u.id === w.cat).words.filter(x => x.id !== w.id));
    q.prompt = "Je to pravda?";
    q.word = target.display + " → „" + other[pL] + "“";
    q.reading = target.sub;
    q.options = ["Ano", "Ne"];
    q.correct = isTrue ? "Ano" : "Ne";
  }
  return q;
}

function typeAccepted(q, ans) {
  const w = q.w, lang = q.lang;
  if (lang === "ja") return isSame(ans, w.ja) || isSame(ans, w.romaji);
  return isSame(ans, w[lang]);
}

function startLesson(unit, mode) {
  Sound.init();
  const words = buildPool(unit, Q_LEN);
  $("#bottomnav").classList.add("hidden");
  Mascot.hide();
  /* nejdřív se slova nauč — pak test */
  startStudy(words, () => {
    lesson = {
      unit, lang: state.lang, mode,
      qs: words.map(w => makeQuestion(w, state.lang)),
      idx: 0, correct: 0, wrong: 0, xp: 0, combo: 0, maxCombo: 0, failed: false
    };
    renderLesson();
  });
}

/* ---------- studijní karty (učení před testem) ---------- */
function startStudy(words, onDone) {
  const v = $("#view");
  const lang = LANGS[state.lang];
  let i = 0;
  v.innerHTML = "";

  const head = el("div", { class: "screen-head" }, [
    el("button", { class: "exit-btn", text: "✕", onclick: () => {
      Sound.click();
      document.removeEventListener("keydown", studyKey);
      $("#bottomnav").classList.remove("hidden"); showView("path");
    } }),
    el("div", { class: "title", text: "📖 Nauč se slova" }),
    el("span", { class: "sub", text: "1/" + words.length })
  ]);
  v.appendChild(head);

  const dots = el("div", { class: "study-dots" });
  words.forEach(() => dots.appendChild(el("span", { class: "study-dot" })));
  v.appendChild(dots);

  const card = el("div", { class: "study-card", onclick: () => card.classList.toggle("flipped") });
  const front = el("div", { class: "study-face" });
  const back = el("div", { class: "study-face back" });
  card.appendChild(el("div", { class: "study-inner" }, [front, back]));
  v.appendChild(card);

  const bottom = el("div", { class: "lesson-bottom" });
  const nextBtn = el("button", { class: "btn-check ready", text: "Další →", onclick: () => {
    Sound.click();
    if (i < words.length - 1) { i++; renderWord(words[i]); }
    else {
      Sound.fanfare();
      document.removeEventListener("keydown", studyKey);
      onDone();
    }
  } });
  bottom.appendChild(nextBtn);
  v.appendChild(bottom);

  function renderWord(w) {
    const t = wordTarget(w, state.lang);
    front.innerHTML = "";
    front.appendChild(el("div", { class: "study-hint", text: "👆 Klepni na kartu pro překlad" }));
    front.appendChild(el("div", { class: "study-word" + (state.lang === "ja" ? " ja" : ""), text: t.display }));
    if (t.sub) front.appendChild(el("div", { class: "study-read", text: t.sub }));
    front.appendChild(el("button", { class: "speak-btn", text: "🔊", onclick: (e) => { e.stopPropagation(); Sound.init(); playWord(t.display, lang.tts, e.currentTarget); } }));

    back.innerHTML = "";
    back.appendChild(el("div", { class: "study-hint", text: w.ico + " " + w.unitName }));
    back.appendChild(el("div", { class: "study-trans", text: w.cs }));
    back.appendChild(el("div", { class: "study-read", text: "🇬🇧 " + w.en + (state.lang === "ja" ? " · 🈂️ " + w.romaji : "")}));
    back.appendChild(el("div", { class: "study-hint", text: "Klepni na kartu zpět" }));

    card.classList.remove("flipped");
    Array.from(dots.children).forEach((d, idx) => d.classList.toggle("on", idx === i));
    head.children[2].textContent = (i + 1) + "/" + words.length;
    nextBtn.textContent = i < words.length - 1 ? "Další →" : "🚀 Začít test";
    setTimeout(() => playWord(t.display, lang.tts), 350);
  }
  renderWord(words[0]);
  const studyKey = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nextBtn.click(); }
  };
  document.addEventListener("keydown", studyKey);
  window.__slovkoKey = studyKey;
}
function startPractice() {
  /* smíšená praxe ze všech odemčených slov, žádné XP, +1 srdce */
  Sound.init();
  const words = [];
  UNITS.forEach(u => { if (unitUnlocked(u.id)) words.push(...u.words); });
  lesson = {
    unit: null, lang: state.lang, mode: "practice",
    qs: shuffle(words).slice(0, 6).map(w => makeQuestion(w, state.lang)),
    idx: 0, correct: 0, wrong: 0, xp: 0, combo: 0, maxCombo: 0, failed: false
  };
  $("#bottomnav").classList.add("hidden");
  Mascot.hide();
  renderLesson();
}
/* ---------- DENNÍ SLOVO (gacha) ---------- */
function openCrate() {
  const ov = el("div", { class: "crate-overlay" });
  const card = el("div", { class: "crate-card" });
  const fresh = state.dailyWordDate !== dateStr();
  const cands = ALL_WORDS.filter(w => getMastery(w.id) < 3);
  const w = pick(cands.length ? cands : ALL_WORDS);
  state.dailyWord = w.id;
  state.dailyWordDate = dateStr();
  save();
  const lang = LANGS[state.lang];
  const t = wordTarget(w, state.lang);
  let revealed = false;

  card.appendChild(el("div", { class: "sub", text: fresh ? "🎁 Slovo dne pro tebe!" : "🔁 Zopakuj si slovo dne" }));
  const box = el("div", { class: "crate-box", text: "📦" });
  card.appendChild(box);
  const result = el("div", { class: "crate-reveal hidden" });
  card.appendChild(result);
  const xpLine = el("div", { class: "crate-xp" });
  card.appendChild(xpLine);
  card.appendChild(el("button", { class: "btn-big", text: "Skončeno ✓", onclick: () => { Sound.click(); ov.remove(); renderPath(); } }));

  box.onclick = () => {
    if (revealed) return;
    revealed = true;
    Sound.fanfare();
    Confetti.burst(140);
    box.classList.add("opening");
    box.textContent = "✨";
    setTimeout(() => {
      result.classList.remove("hidden");
      result.innerHTML = "";
      result.appendChild(el("div", { class: "crate-word" + (state.lang === "ja" ? " ja" : ""), text: t.display }));
      if (t.sub) result.appendChild(el("div", { class: "crate-read", text: t.sub }));
      result.appendChild(el("div", { class: "crate-trans", text: w.cs + " · 🇬🇧 " + w.en }));
      result.appendChild(el("button", { class: "speak-btn", text: "🔊", onclick: (e) => { Sound.init(); playWord(t.display, lang.tts, e.currentTarget); } }));
      if (fresh) {
        addXp(10);
        flyXp("+10 XP");
        xpLine.textContent = "+10 XP za slovo dne! 🎉";
      } else {
        xpLine.textContent = "Slovo dne už odemčeno — zopakuj si ho.";
      }
    }, 500);
  };
  ov.appendChild(card);
  document.body.appendChild(ov);
}

function startDrill(drillType) {
  /* samostatný trénink: 'listen' nebo 'speak' — všechny otázky daného typu */
  Sound.init();
  const words = [];
  UNITS.forEach(u => { if (unitUnlocked(u.id) && !u.kana) words.push(...u.words); });
  const qs = [];
  for (const w of shuffle(words).slice(0, 8)) {
    const q = makeQuestion(w, state.lang);
    if (q.type === drillType || (drillType === "listen" && (q.type === "listening" || q.type === "listentype"))) {
      qs.push(q);
    } else {
      q.type = drillType === "listen" ? "listening" : "speak";
      q.prompt = q.type === "listening" ? "Poslouchej a vyber, co slyšíš:" : "Vyslov nahlas:";
      q.word = q.type === "listening" ? "" : wordTarget(w, state.lang).display;
      q.reading = q.type === "listening" ? "" : wordTarget(w, state.lang).sub;
      q.say = wordTarget(w, state.lang).display;
      if (q.type === "listening") {
        const opts = [w[promptLang()]];
        const cands = shuffle(words.filter(x => x.id !== w.id).map(x => x[promptLang()]));
        for (const o of cands) { if (opts.indexOf(o) === -1) opts.push(o); if (opts.length >= 4) break; }
        q.options = opts;
      } else {
        q.options = [];
      }
      q.correct = q.type === "listening" ? w[promptLang()] : (state.lang === "ja" ? q.w.romaji : q.w[state.lang]);
      qs.push(q);
    }
  }
  lesson = {
    unit: null, lang: state.lang, mode: "drill",
    qs, idx: 0, correct: 0, wrong: 0, xp: 0, combo: 0, maxCombo: 0, failed: false
  };
  $("#bottomnav").classList.add("hidden");
  Mascot.hide();
  renderLesson();
}

function renderLesson() {
  const v = $("#view");
  const q = lesson.qs[lesson.idx];
  const total = lesson.qs.length;
  v.innerHTML = "";
  const pct = lesson.idx / total * 100;

  const top = el("div", { class: "lesson-top" }, [
    el("button", { class: "exit-btn", text: "✕", onclick: () => {
      Sound.click();
      document.removeEventListener("keydown", window.__slovkoKey);
      if (confirm("Opravdu chceš odejít z lekce? Postup se neuloží.")) { $("#bottomnav").classList.remove("hidden"); showView("path"); }
    } }),
    el("div", { class: "lesson-prog" }, [el("span", { style: "width:" + pct + "%" })]),
    el("div", { class: "combo-box" },
      lesson.combo >= 2 ? [el("span", { text: "🔥" }), el("span", { class: "c-num", text: lesson.combo + "×" })] : [el("span", { text: "" })])
  ]);
  v.appendChild(top);

  const qcard = el("div", { class: "q-card" }, [
    el("div", { class: "q-prompter", text: q.prompt })
  ]);
  if (q.word) {
    qcard.appendChild(el("div", { class: "q-word" + (q.lang === "ja" ? " ja" : ""), text: q.word }));
  }
  if (q.reading) {
    qcard.appendChild(el("div", { class: "q-reading", text: q.reading }));
  }
  if (q.say) {
    qcard.appendChild(el("button", { class: "speak-btn", text: "🔊", onclick: (e) => { Sound.init(); playWord(q.say, LANGS[q.lang].tts, e.currentTarget); } }));
    setTimeout(() => { playWord(q.say, LANGS[q.lang].tts); }, 400);
  }
  v.appendChild(qcard);

  const ansGrid = el("div", { class: "answer-grid" + (q.options.length === 2 ? " one-col" : "") });
  questionState = { selected: null, checked: false };
  let typeInput = null;
  const isListenType = q.type === "listentype";

  if (q.type === "type" || isListenType) {
    typeInput = el("input", {
      class: "type-input", type: "text",
      placeholder: isListenType ? "Napiš, co slyšíš…" : "Napiš odpověď…",
      autocomplete: "off", autocorrect: "off", spellcheck: "false",
      oninput: (e) => { checkBtn.classList.toggle("ready", e.target.value.trim().length > 0); }
    });
    v.appendChild(typeInput);
    const hintBtn = el("button", {
      class: "hint-btn",
      text: isListenType ? "🔁 Přehraj znovu" : "💡 Nápověda",
      onclick: (e) => {
        if (isListenType) { Sound.init(); playWord(q.say, LANGS[q.lang].tts); }
        else e.currentTarget.textContent = "Nápověda: " + (q.lang === "ja" ? q.w.romaji : q.w[q.lang]);
      }
    });
    v.appendChild(hintBtn);
    setTimeout(() => typeInput && typeInput.focus(), 100);
  } else if (q.type === "speak") {
    const area = el("div", { class: "speak-area" });
    const msg = el("div", { class: "speak-msg" });
    let repeatBtns = null;
    function showRepeat() {
      if (repeatBtns) { repeatBtns.style.display = ""; return; }
      msg.className = "speak-msg";
      msg.textContent = "Poslechni si výslovnost a opakuj nahlas.";
      repeatBtns = el("div", { class: "drill-row", style: "width:100%" });
      const okBtn = el("button", { class: "drill-card green", html: "<div class='d-ico'>✅</div><div class='d-name'>Zvládám</div>", onclick: () => finishSpeak(true) });
      const againBtn = el("button", { class: "drill-card blue", html: "<div class='d-ico'>🔁</div><div class='d-name'>Ještě jednou</div>", onclick: () => { Sound.init(); playWord(q.say, LANGS[q.lang].tts); } });
      const noBtn = el("button", { class: "drill-card pink", html: "<div class='d-ico'>😅</div><div class='d-name'>Nevím</div>", onclick: () => finishSpeak(false) });
      repeatBtns.appendChild(okBtn); repeatBtns.appendChild(againBtn); repeatBtns.appendChild(noBtn);
      area.appendChild(repeatBtns);
    }
    area.appendChild(msg);
    if (Recog.available) {
      const mic = el("button", { class: "mic-btn", text: "🎤", onclick: () => {
        if (questionState.checked) return;
        msg.className = "speak-msg listening";
        msg.textContent = "Poslouchám… 🎧";
        mic.classList.add("listening"); mic.disabled = true;
        const ok = Recog.listen(LANGS[q.lang].tts, (texts) => {
          mic.disabled = false; mic.classList.remove("listening");
          const hit = Recog.match(texts, q.w, q.lang);
          if (hit) {
            msg.className = "speak-msg ok";
            msg.textContent = "Skvělé, slyšel jsem to! 🎉";
            Recog.stop();
            setTimeout(() => finishSpeak(true), 300);
          } else {
            msg.className = "speak-msg no";
            msg.textContent = "Zkus to znovu. Slyšel jsem: „" + texts[0] + "“";
          }
        }, () => {
          mic.disabled = false; mic.classList.remove("listening");
          msg.className = "speak-msg no";
          msg.textContent = "Mikrofon tě neslyšel. Zkus to znovu.";
        });
        if (!ok) { mic.disabled = false; mic.classList.remove("listening"); msg.textContent = "Mikrofon není dostupný. Použij tlačítka níže."; }
      } });
      area.appendChild(mic);
      area.appendChild(el("div", { class: "speak-hint", text: "Stiskni 🎤 a řekni slovo nahlas. Mikrofon tě pozná." }));
    }
    showRepeat();
    v.appendChild(area);
  } else {
    q.options.forEach(opt => {
      const b = el("button", { class: "answer-btn", text: opt, onclick: (e) => {
        if (questionState.checked) return;
        Sound.click();
        questionState.selected = opt;
        $$(".answer-btn", v).forEach(x => x.classList.remove("sel"));
        e.currentTarget.classList.add("sel");
        checkBtn.classList.add("ready");
        checkBtn.classList.remove("disabled");
      } });
      ansGrid.appendChild(b);
    });
    v.appendChild(ansGrid);
  }

  const fb = el("div", { class: "fb hidden" });
  v.appendChild(fb);

  const bottom = el("div", { class: "lesson-bottom" });
  const checkBtn = el("button", {
    class: "btn-check",
    text: "Kontrola",
    style: q.type === "speak" ? "display:none" : "",
    onclick: () => {
      if (questionState.checked) return;
      let ans;
      if (q.type === "type" || q.type === "listentype") ans = typeInput.value;
      else ans = questionState.selected;
      if (ans === null || ans === undefined || (typeof ans === "string" && !ans.trim())) return;
      checkAnswer(q, ans, typeInput, ansGrid, fb, checkBtn, v);
    }
  });
  bottom.appendChild(checkBtn);
  v.appendChild(bottom);

  function finishSpeak(ok) {
    Recog.stop();
    if (questionState.checked) return;
    checkAnswer(q, ok ? q.correct : "__NEVIM__", null, null, fb, checkBtn, v);
    checkBtn.style.display = "";
  }

  /* hudba se ztiší u poslechových a mluvených cvičení */
  if (q.type === "listening" || q.type === "listentype" || q.type === "speak") Music.duck(0.15);
  else Music.duck(1);

  /* sova-pomocnice: po nečinnosti napoví */
  Mascot.hide();
  Mascot.onTap(null);
  let idleT = null, hinted = false;
  function applyHint() {
    if (q.type === "choice" || q.type === "reverse" || q.type === "truefalse") {
      $$(".answer-btn", v).forEach(b => {
        if (b.textContent === q.correct) { b.classList.add("correct"); }
      });
      toast("💡 Tohle je správná odpověď!");
    } else if (q.type === "type" || q.type === "listentype") {
      if (typeInput) typeInput.placeholder = q.lang === "ja" ? "💡 Tip: " + q.w.romaji : "💡 Tip: " + q.w[q.lang];
      toast("💡 Nápověda v místě pro psaní");
    } else if (q.type === "speak") {
      playWord(q.say, LANGS[q.lang].tts);
      toast("💡 Poslechni si výslovnost a opakuj");
    }
  }
  function fireIdle() {
    if (questionState.checked) return;
    Mascot.mood("🤔");
    Mascot.say("Zasekl ses? Klepni na mě 👆", 0);
    Mascot.onTap(() => {
      Mascot.mood("😊");
      Mascot.say("Tady máš nápovědu! 💡", 2200);
      if (!hinted) { hinted = true; applyHint(); }
    });
  }
  function resetIdle() {
    if (questionState.checked) return;
    if (idleT) clearTimeout(idleT);
    idleT = setTimeout(fireIdle, 12000);
  }
  v.addEventListener("pointerdown", resetIdle);
  if (typeInput) typeInput.addEventListener("input", resetIdle);
  resetIdle();

  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); checkBtn.click(); }
  };
  document.addEventListener("keydown", onKey);
  window.__slovkoKey = onKey;
}

function checkAnswer(q, ans, typeInput, ansGrid, fb, checkBtn, v) {
  questionState.checked = true;
  let ok = false;
  if (q.type === "type" || q.type === "listentype") ok = typeAccepted(q, ans);
  else ok = ans === q.correct;

  const correctText = (q.type === "type" || q.type === "listentype")
    ? (q.lang === "ja" ? q.w.ja + " (" + q.w.romaji + ")" : q.w[q.lang])
    : (q.type === "speak" ? (q.lang === "ja" ? q.w.ja + " (" + q.w.romaji + ")" : q.w[q.lang]) : q.correct);

  if (ok) {
    lesson.combo++;
    lesson.maxCombo = Math.max(lesson.maxCombo, lesson.combo);
    lesson.correct++;
    if (q.type === "speak") state.speakCount++;
    if (q.type === "listening" || q.type === "listentype") state.listenCount++;
    const mult = Math.min(1 + (lesson.combo - 1) * 0.05, 2);
    const gain = lesson.mode === "practice" ? 0 : Math.round(10 * mult);
    lesson.xp += gain;
    setMastery(q.w.id, getMastery(q.w.id) + 1);
    Sound.correct(lesson.combo);
    fb.className = "fb ok";
    fb.innerHTML = "Správně!" + (lesson.mode === "lesson" ? ' <span class="fb-correct">+' + gain + " XP</span>" : "");
    if (lesson.mode === "lesson" && gain > 0) flyXp("+" + gain + " XP");
    if (q.type === "type" || q.type === "listentype") typeInput.classList.add("correct");
    else $$(".answer-btn", v).forEach(b => { if (b.textContent === ans) b.classList.add("correct"); });
  } else {
    lesson.combo = 0;
    lesson.wrong++;
    setMastery(q.w.id, Math.max(0, getMastery(q.w.id) - 1));
    Sound.wrong();
    fb.className = "fb no";
    fb.innerHTML = "Skoro! Správně: <span class='fb-correct'>" + correctText + "</span>";
    if (q.type === "type" || q.type === "listentype") typeInput.classList.add("wrong");
    else $$(".answer-btn", v).forEach(b => { if (b.textContent === q.correct) b.classList.add("correct"); });
    if (lesson.mode === "lesson") {
      state.hearts = Math.max(0, state.hearts - 1);
      const hb = $("#heartsBox");
      hb.classList.remove("lose"); void hb.offsetWidth; hb.classList.add("lose");
      if (state.hearts < 5 && !state.heartsRegenAt) state.heartsRegenAt = Date.now() + 30 * 60 * 1000;
      renderTop();
      if (state.hearts <= 0) {
        lesson.failed = true;
        fb.innerHTML = "Došla ti srdíčka! 💔";
        document.removeEventListener("keydown", window.__slovkoKey);
        checkBtn.style.display = "none";
        setTimeout(() => endLesson(), 1400);
        return;
      }
    }
  }

  checkBtn.className = "btn-continue";
  checkBtn.textContent = "Pokračovat →";
  checkBtn.onclick = () => {
    document.removeEventListener("keydown", window.__slovkoKey);
    lesson.idx++;
    renderTop();
    if (lesson.idx >= lesson.qs.length) endLesson();
    else renderLesson();
  };
}

function endLesson() {
  const success = !lesson.failed && lesson.idx >= lesson.qs.length;
  if (success) {
    addXp(lesson.xp);
    if (lesson.mode === "lesson") {
      state.lessons++;
      if (lesson.wrong === 0) state.perfectLessons++;
      state.maxCombo = Math.max(state.maxCombo, lesson.maxCombo);
      state.langsTried[state.lang] = (state.langsTried[state.lang] || 0) + 1;

      /* streak */
      const today = dateStr();
      if (state.lastPlay !== today) {
        if (state.lastPlay === yesterdayStr()) state.streak++;
        else state.streak = 1;
        state.lastPlay = today;
      }
      state.bestStreak = Math.max(state.bestStreak, state.streak);

      if (lesson.unit) {
        completeUnit(lesson.unit.id);
        if (lesson.wrong === 0) toast("💎 Perfektní lekce!");
      }
    } else if (lesson.mode === "practice") {
      const prev = state.hearts;
      state.hearts = Math.min(5, state.hearts + 1);
      renderTop();
      if (state.hearts > prev) { toast("❤️ Získal jsi srdce!"); Sound.heart(); }
    }
    if (lesson.mode !== "practice" && lesson.xp >= 10) Confetti.burst(90);
  }
  checkAchievements();
  if (success && lesson.xp > 0) LB.sync();
  renderResult(success);
}

function addXp(n) {
  const before = levelInfo(state.xp).level;
  state.xp += n;
  state.dailyXp += n;
  const after = levelInfo(state.xp).level;
  if (after > before) { Sound.levelup(); Confetti.burst(160); toast("🎉 Level UP! Jsi " + levelInfo(state.xp).name + "!"); }
  if (state.dailyXp >= state.dailyGoal) { toast("🎯 Denní cíl splněn! Šampion!"); }
  save();
  renderTop();
}

function renderResult(success) {
  const v = $("#view");
  $("#bottomnav").classList.remove("hidden");
  Music.duck(1);
  v.innerHTML = "";

  if (success) {
    Mascot.mood(lesson.wrong === 0 ? "🤩" : "😊");
    Mascot.say(lesson.wrong === 0 ? "PERFEKTNÍ! Nezastavitelný!" : "Skvělé! Jde ti to!", 4000);
    v.appendChild(el("div", { class: "result-wrap" }, [
      el("div", { class: "result-owl", text: lesson.wrong === 0 ? "🏆" : "🦉" }),
      el("div", { class: "result-title", text: lesson.wrong === 0 ? "Perfektní!" : (lesson.mode === "drill" ? "Trénink dokončen!" : "Lekce dokončena!") }),
      el("div", { class: "result-sub", text: LANGS[state.lang].flag + " " + LANGS[state.lang].name }),
      el("div", { class: "xp-earned", text: lesson.mode === "practice" ? "❤️ +1 srdce" : "+" + lesson.xp + " XP" }),
      el("div", { class: "stat-row" }, [
        el("div", { class: "stat-box" }, [el("div", { class: "num", text: lesson.correct }), el("div", { class: "lbl", text: "Správně" })]),
        el("div", { class: "stat-box" }, [el("div", { class: "num", text: lesson.wrong }), el("div", { class: "lbl", text: "Chybně" })]),
        el("div", { class: "stat-box" }, [el("div", { class: "num", text: "🔥" + lesson.maxCombo }), el("div", { class: "lbl", text: "Kombo" })])
      ]),
      el("button", { class: "btn-big", text: "Pokračovat 🚀", onclick: () => { Sound.click(); showView("path"); } })
    ]));
  } else {
    Mascot.mood("😢");
    Mascot.say("Srdíčka došla… ale nevzdávej to! Procvič a vrať se silnější.", 5000);
    Sound.fail();
    v.appendChild(el("div", { class: "result-wrap" }, [
      el("div", { class: "result-owl", text: "💔" }),
      el("div", { class: "result-title", text: "Došla srdíčka" }),
      el("div", { class: "result-sub", text: "Nezoufej! Procvičování ti vrátí srdce a pomůže si vzpomenout." }),
      el("div", { class: "xp-earned", text: "Vydělal jsi ale +" + lesson.xp + " XP" }),
      el("button", { class: "btn-big ghost", text: "🎯 Procvičit a získat ❤️", onclick: () => { Sound.click(); startPractice(); } }),
      el("button", { class: "btn-big violet", text: "Zkusit znovu 🔄", onclick: () => { Sound.click(); if (lesson.unit) startLesson(lesson.unit, "lesson"); else startPractice(); } }),
      el("button", { class: "btn-big ghost", text: "Zpět na cestu", onclick: () => { Sound.click(); showView("path"); } })
    ]));
  }
  save();
}

/* ---------- úspěchy ---------- */
function checkAchievements() {
  let any = false;
  ACHIEVEMENTS.forEach(a => {
    if (state.achievements[a.id]) return;
    if (achValue(a.track) >= a.goal) {
      state.achievements[a.id] = true;
      any = true;
      toast(a.ico + " Úspěch: " + a.name + "!");
    }
  });
  if (any) { Sound.fanfare(); Confetti.burst(140); }
  save();
}

/* ---------- init ---------- */
function init() {
  loadState();
  ensureUnlocks();
  renderTop();
  $("#musicBtn").classList.toggle("off", !state.music);
  $("#musicIco").textContent = state.music ? "🎵" : "🔇";
  showView("path");
  Speak.init();
  if (!state.user) setTimeout(() => Auth.showLogin(), 400);

  /* hudba + zvuk: spustí se po první interakci (autoplay pravidla) */
  const startMusic = () => {
    Sound.init();
    Speak.warm();
    if (state.music) Music.start();
    window.removeEventListener("pointerdown", startMusic);
  };
  window.addEventListener("pointerdown", startMusic, { once: true });

  /* srdce — kontrola každých 30 s */
  setInterval(() => {
    const prev = state.hearts;
    catchUpHearts();
    if (state.hearts !== prev) { renderTop(); save(); if (state.hearts > prev) toast("❤️ +1 srdce"); }
  }, 30000);

  if (state.lessons === 0) {
    setTimeout(() => {
      Mascot.say("Ahoj! Jsem Sova a budu tě učit jazyky. Vyber jazyk a jedeme! 🚀", 6000);
    }, 600);
  } else {
    setTimeout(() => { Mascot.say("Vítej zpět! Pokračuj ve své sérii! 🔥", 4000); }, 600);
  }
  save();
}

init();

/* ladění / testy */
window.__slovko = {
  get state() { return state; },
  get lesson() { return lesson; },
  get q() { return lesson ? lesson.qs[lesson.idx] : null; },
  music: Music,
  speak: Speak
};