/* Reddit Pro Plus Max - floating panel (shadow DOM) */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  const PANEL_CSS = `
    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      top: 4vh;
      right: 14px;
      width: 440px;
      max-width: calc(100vw - 28px);
      height: min(88vh, 920px);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #e6e7e8;
      --bg: #111214;
      --bg2: #181a1d;
      --bg3: #202327;
      --line: #2c3035;
      --accent: #ff4500;
      --accent2: #ff7a45;
      --muted: #9aa0a6;
      --danger: #ff585b;
      --ok: #46d160;
    }
    * { box-sizing: border-box; }
    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
      overflow: hidden;
      color: #e6e7e8;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: linear-gradient(180deg, #1b1d21, #15171a);
      border-bottom: 1px solid var(--line);
      user-select: none;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.2px;
      white-space: nowrap;
      color: #ffffff;
    }
    .logo {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      background: var(--accent);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 12px;
      font-weight: 900;
    }
    .brand small {
      display: block;
      font-weight: 500;
      font-size: 9px;
      color: var(--muted);
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .tabs {
      display: flex;
      gap: 2px;
      margin-left: auto;
      background: #0d0e10;
      border: 1px solid var(--line);
      border-radius: 9px;
      padding: 2px;
    }
    .tabs button {
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--muted);
      font: 600 11px/1 inherit;
      padding: 7px 8px;
      border-radius: 7px;
      cursor: pointer;
    }
    .tabs button:hover { color: #fff; }
    .tabs button.active {
      background: var(--accent);
      color: #fff;
    }
    .close {
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 20px;
      line-height: 1;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      cursor: pointer;
    }
    .close:hover { background: var(--bg3); color: #fff; }
    .body {
      flex: 1;
      overflow: auto;
      padding: 12px;
      scrollbar-width: thin;
      scrollbar-color: #33373d transparent;
    }
    .body::-webkit-scrollbar { width: 9px; }
    .body::-webkit-scrollbar-thumb { background: #33373d; border-radius: 9px; }
    .section {
      background: var(--bg2);
      border: 1px solid var(--line);
      border-radius: 11px;
      padding: 10px;
      margin-bottom: 10px;
      color: #e6e7e8;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.2px;
      margin-bottom: 8px;
      color: #fff;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      row-gap: 6px;
    }
    .between { justify-content: space-between; }
    .wrap { flex-wrap: wrap; }
    .gap { gap: 10px; }
    .muted { color: var(--muted); font-size: 11px; line-height: 1.4; }
    .error { color: var(--danger) !important; }
    .btn {
      appearance: none;
      border: 1px solid var(--line);
      background: var(--bg3);
      color: #e6e7e8;
      border-radius: 8px;
      padding: 7px 10px;
      font: 700 11px/1 inherit;
      cursor: pointer;
      white-space: nowrap;
      text-decoration: none;
    }
    .btn:hover { border-color: #4a4f56; background: #2a2e33; color: #fff; }
    .btn:focus-visible, .tabs button:focus-visible, .close:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }
    .btn-sm { padding: 5px 8px; font-size: 10px; }
    .btn-danger { border-color: rgba(255, 88, 91, 0.5); color: #ff8b8d; }
    .btn-danger:hover { background: rgba(255, 88, 91, 0.16); }
    .btn-accent { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn-accent:hover { background: var(--accent2); border-color: var(--accent2); }
    .input, .select, .textarea {
      background: #0d0e10;
      border: 1px solid var(--line);
      color: #e6e7e8;
      border-radius: 8px;
      padding: 7px 9px;
      font: 500 11px/1.2 inherit;
      min-width: 0;
      flex: 1;
    }
    .input-sm { flex: 0 1 120px; }
    .input-xs { flex: 0 1 78px; }
    .select { flex: 0 0 auto; }
    .textarea { width: 100%; min-height: 62px; resize: vertical; margin: 8px 0; }
    .input:focus, .select:focus, .textarea:focus {
      outline: 2px solid rgba(255, 69, 0, 0.45);
      outline-offset: 1px;
    }
    input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .list-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: var(--bg2);
      border: 1px solid var(--line);
      border-radius: 9px;
      padding: 8px;
    }
    .list-item:hover { border-color: #3d4249; }
    .list-main { min-width: 0; flex: 1; }
    .list-title {
      font-size: 11.5px;
      font-weight: 650;
      line-height: 1.35;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .list-title a { color: #e6e7e8; text-decoration: none; }
    .list-title a:hover { color: var(--accent2); text-decoration: underline; }
    .list-meta {
      margin-top: 4px;
      color: var(--muted);
      font-size: 9.5px;
      line-height: 1.35;
    }
    .pill {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 999px;
      background: rgba(255, 69, 0, 0.15);
      color: var(--accent2);
      font-weight: 700;
      margin-right: 3px;
    }
    .check { margin-top: 2px; accent-color: var(--accent); }
    .thumb {
      width: 42px;
      height: 42px;
      border-radius: 6px;
      object-fit: cover;
      flex: 0 0 auto;
      background: #000;
    }
    .empty {
      padding: 18px 10px;
      text-align: center;
      color: var(--muted);
      font-size: 11px;
      border: 1px dashed var(--line);
      border-radius: 9px;
    }
    .warning {
      background: rgba(255, 88, 91, 0.09);
      border: 1px solid rgba(255, 88, 91, 0.35);
      color: #ffb3b4;
      border-radius: 9px;
      padding: 9px;
      font-size: 10.5px;
      line-height: 1.5;
      margin-bottom: 9px;
    }
    .progress {
      height: 6px;
      background: #0d0e10;
      border-radius: 999px;
      overflow: hidden;
      margin: 8px 0 4px;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      transition: width 0.2s ease;
    }
    .log {
      max-height: 150px;
      overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 9.5px;
      line-height: 1.5;
      color: var(--muted);
    }
    .log-line { border-bottom: 1px solid #1c1e21; padding: 2px 0; }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 5px;
      background: #2a2e33;
      color: #c8ccd0;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .user-card {
      margin-top: 9px;
      border-top: 1px solid var(--line);
      padding-top: 9px;
    }
    .loading {
      padding: 28px 10px;
      text-align: center;
      color: var(--muted);
      font-size: 11px;
    }
    .toast-host {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      pointer-events: none;
    }
    .toast {
      padding: 9px 11px;
      border-radius: 9px;
      background: #1f2226;
      border: 1px solid var(--line);
      color: #fff;
      font-size: 11px;
      line-height: 1.35;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .toast.success { border-color: var(--ok); }
    .toast.error { border-color: var(--danger); }
    .toast.info { border-color: #4fbcff; }
    .toast.out { opacity: 0; transform: translateY(6px); }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 4px;
      border-bottom: 1px solid #1c1e21;
      font-size: 11.5px;
      color: #e6e7e8;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .toggle-row:hover {
      background: rgba(255, 255, 255, 0.035);
    }
    .toggle-row span {
      color: #e6e7e8;
    }
    .toggle-row:hover span {
      color: #ffffff;
    }
    .toggle-row:last-child { border-bottom: 0; }
    .toggle-row input { accent-color: var(--accent); width: 15px; height: 15px; cursor: pointer; }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .stat {
      background: #0d0e10;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 7px;
    }
    .stat b { display: block; font-size: 14px; color: #fff; }
    .stat span { color: var(--muted); font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }

    /* Aliases used by the saved / cleanup / mod renderers. */
    .rppm-section { background: var(--bg2); border: 1px solid var(--line); border-radius: 11px; padding: 10px; margin-bottom: 10px; color: #e6e7e8; }
    .rppm-section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.2px; margin-bottom: 8px; color: #fff; }
    .rppm-row { display: flex; align-items: center; gap: 8px; row-gap: 6px; }
    .rppm-between { justify-content: space-between; }
    .rppm-wrap { flex-wrap: wrap; }
    .rppm-gap { gap: 10px; }
    .rppm-muted { color: var(--muted); font-size: 11px; line-height: 1.4; }
    .rppm-error { color: var(--danger) !important; }
    .rppm-btn { appearance: none; border: 1px solid var(--line); background: var(--bg3); color: #e6e7e8; border-radius: 8px; padding: 7px 10px; font: 700 11px/1 inherit; cursor: pointer; white-space: nowrap; text-decoration: none; }
    .rppm-btn:hover { border-color: #4a4f56; background: #2a2e33; color: #fff; }
    .rppm-btn:visited { color: #e6e7e8; }
    .rppm-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    .rppm-btn-sm { padding: 5px 8px; font-size: 10px; }
    .rppm-btn-danger { border-color: rgba(255, 88, 91, 0.5); color: #ff8b8d; }
    .rppm-btn-danger:hover { background: rgba(255, 88, 91, 0.16); }
    .rppm-input, .rppm-select, .rppm-textarea { background: #0d0e10; border: 1px solid var(--line); color: #e6e7e8; border-radius: 8px; padding: 7px 9px; font: 500 11px/1.2 inherit; min-width: 0; flex: 1; }
    .rppm-input-sm { flex: 0 1 120px; }
    .rppm-input-xs { flex: 0 1 82px; }
    .rppm-select { flex: 0 0 auto; }
    .rppm-textarea { width: 100%; min-height: 62px; resize: vertical; margin: 8px 0; }
    .rppm-input:focus, .rppm-select:focus, .rppm-textarea:focus { outline: 2px solid rgba(255, 69, 0, 0.45); outline-offset: 1px; }
    .rppm-list { display: flex; flex-direction: column; gap: 6px; }
    .rppm-list-item { display: flex; gap: 8px; align-items: flex-start; background: var(--bg2); border: 1px solid var(--line); border-radius: 9px; padding: 8px; }
    .rppm-list-item:hover { border-color: #3d4249; }
    .rppm-list-main { min-width: 0; flex: 1; }
    .rppm-list-title { font-size: 11.5px; font-weight: 650; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .rppm-list-title a { color: #e6e7e8; text-decoration: none; }
    .rppm-list-title a:hover { color: var(--accent2); text-decoration: underline; }
    .rppm-list-meta { margin-top: 4px; color: var(--muted); font-size: 9.5px; line-height: 1.35; }
    .rppm-pill { display: inline-block; padding: 1px 5px; border-radius: 999px; background: rgba(255, 69, 0, 0.15); color: var(--accent2); font-weight: 700; margin-right: 3px; }
    .rppm-check { margin-top: 2px; accent-color: var(--accent); }
    .rppm-thumb { width: 42px; height: 42px; border-radius: 6px; object-fit: cover; flex: 0 0 auto; background: #000; }
    .rppm-empty { padding: 18px 10px; text-align: center; color: var(--muted); font-size: 11px; border: 1px dashed var(--line); border-radius: 9px; }
    .rppm-warning { background: rgba(255, 88, 91, 0.09); border: 1px solid rgba(255, 88, 91, 0.35); color: #ffb3b4; border-radius: 9px; padding: 9px; font-size: 10.5px; line-height: 1.5; margin-bottom: 9px; }
    .rppm-progress { height: 6px; background: #0d0e10; border-radius: 999px; overflow: hidden; margin: 8px 0 4px; }
    .rppm-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); transition: width 0.2s ease; }
    .rppm-log { max-height: 150px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9.5px; line-height: 1.5; color: var(--muted); scrollbar-width: thin; scrollbar-color: #33373d transparent; }
    .rppm-log-line { border-bottom: 1px solid #1c1e21; padding: 2px 0; }
    .rppm-badge { display: inline-block; padding: 1px 5px; border-radius: 5px; background: #2a2e33; color: #c8ccd0; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .rppm-user-card { margin-top: 9px; border-top: 1px solid var(--line); padding-top: 9px; }
  `;

  let host = null;
  let shadow = null;
  let bodyEl = null;
  let activeTab = "saved";

  function ensureHost() {
    if (host) return;
    host = document.createElement("div");
    host.id = "rppm-panel-host";
    host.style.cssText =
      "all: initial; position: fixed; z-index: 2147483647; top: 4vh; right: 14px; width: 440px; max-width: calc(100vw - 28px); height: min(88vh, 920px); display: none; color: #e6e7e8; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;";
    document.documentElement.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      "<style>" +
      PANEL_CSS +
      "</style>" +
      '<div class="panel">' +
      '<div class="head">' +
      '<div class="brand"><div class="logo">R++</div><div>Reddit Pro Plus Max S<small>tek eklenti · tüm araçlar</small></div></div>' +
      '<div class="tabs">' +
      '<button data-tab="saved">Kayıt</button>' +
      '<button data-tab="cleanup">Temizlik</button>' +
      '<button data-tab="mod">Mod</button>' +
      '<button data-tab="settings">Ayarlar</button>' +
      "</div>" +
      '<button class="close" title="Kapat (Esc)">×</button>' +
      "</div>" +
      '<div class="body"></div>' +
      '<div class="toast-host"></div>' +
      "</div>";

    bodyEl = shadow.querySelector(".body");
    shadow.querySelector(".close").addEventListener("click", close);
    shadow.querySelectorAll(".tabs button").forEach((button) => {
      button.addEventListener("click", () => open(button.dataset.tab));
    });
    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  function open(tab) {
    ensureHost();
    activeTab = tab || activeTab;
    host.style.display = "block";
    shadow.querySelectorAll(".tabs button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === activeTab);
    });
    renderTab(activeTab);
  }

  function close() {
    if (!host) return;
    host.style.display = "none";
  }

  function toggle() {
    ensureHost();
    if (host.style.display === "none") open(activeTab);
    else close();
  }

  function toast(message, kind) {
    ensureHost();
    const hostEl = shadow.querySelector(".toast-host");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "info");
    el.textContent = message;
    hostEl.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  async function renderTab(tab) {
    bodyEl.innerHTML = '<div class="loading">Yükleniyor…</div>';
    try {
      if (tab === "saved") {
        await RPPM.saved.render(bodyEl);
      } else if (tab === "cleanup") {
        await RPPM.cleanup.render(bodyEl);
      } else if (tab === "mod") {
        await RPPM.modtoolsRender(bodyEl);
      } else {
        await renderSettings(bodyEl);
      }
    } catch (err) {
      bodyEl.innerHTML =
        '<div class="section"><div class="error">Panel yüklenemedi: ' +
        RPPM.escapeHtml(err.message) +
        "</div></div>";
    }
  }

  const QUICK_TOGGLES = [
    ["enabled", "Eklenti açık"],
    ["simplify.enabled", "Arayüz sadeleştirme"],
    ["simplify.hideRightRail", "Sağ kenar çubuğunu gizle"],
    ["simplify.hideSidebar", "Sol gezinmeyi gizle"],
    ["simplify.hideAwards", "Ödülleri gizle"],
    ["simplify.compact", "Kompakt mod"],
    ["simplify.wideFeed", "Geniş akış"],
    ["ads.enabled", "Reklam engelleme"],
    ["ads.hidePromoted", "Sponsorlu gönderileri gizle"],
    ["comments.enabled", "Yorum katlama"],
    ["comments.keyboard", "Klavye kısayolları (j / k / z)"],
    ["extras.fixTranslate", "Otomatik çeviri yönlendirmesini kaldır"],
    ["extras.directImages", "Görselleri doğrudan aç"],
    ["extras.nsfwUnblur", "NSFW bulanıklığını kaldır"],
    ["extras.oldRedditButton", "old / yeni Reddit düğmesi"],
    ["mod.enabled", "Moderatör araçları"],
    ["mod.hoverCard", "Kullanıcı hover kartı"]
  ];

  async function renderSettings(container) {
    let stats = {};
    try {
      const got = await browser.storage.local.get("stats");
      stats = got.stats || {};
    } catch (err) {
      /* ignore */
    }

    const toggles = QUICK_TOGGLES.map(([path, label]) => {
      const checked = RPPM.get(path) ? " checked" : "";
      return (
        '<label class="toggle-row"><span>' +
        RPPM.escapeHtml(label) +
        '</span><input type="checkbox" data-setting="' +
        path +
        '"' +
        checked +
        "></label>"
      );
    }).join("");

    const theme = RPPM.get("extras.theme", "auto");

    container.innerHTML =
      '<div class="section">' +
      '<div class="section-title">Hızlı ayarlar</div>' +
      toggles +
      '<div class="toggle-row"><span>Tema (eski Reddit)</span>' +
      '<select class="select" id="rppm-theme">' +
      '<option value="auto"' +
      (theme === "auto" ? " selected" : "") +
      ">Otomatik</option>" +
      '<option value="dark"' +
      (theme === "dark" ? " selected" : "") +
      ">Koyu</option>" +
      '<option value="amoled"' +
      (theme === "amoled" ? " selected" : "") +
      ">AMOLED</option>" +
      "</select></div>" +
      "</div>" +
      '<div class="section">' +
      '<div class="section-title">İstatistikler</div>' +
      '<div class="stat-grid">' +
      '<div class="stat"><b>' +
      RPPM.formatNumber(stats.adsBlocked || 0) +
      "</b><span>engellenen reklam</span></div>" +
      '<div class="stat"><b>' +
      RPPM.formatNumber(stats.commentsCollapsed || 0) +
      "</b><span>katlanan yorum</span></div>" +
      '<div class="stat"><b>' +
      RPPM.formatNumber(stats.postsFiltered || 0) +
      "</b><span>filtrelenen gönderi</span></div>" +
      '<div class="stat"><b>' +
      RPPM.formatNumber(stats.deleted || 0) +
      "</b><span>silinen öğe</span></div>" +
      "</div></div>" +
      '<div class="section">' +
      '<div class="section-title">Bağlantılar</div>' +
      '<div class="row wrap">' +
      '<button class="btn" id="rppm-open-options">Tüm ayarlar</button>' +
      '<button class="btn" id="rppm-toggle-old">' +
      (RPPM.isOld() ? "Yeni Reddit'e geç" : "old Reddit'e geç") +
      "</button>" +
      '<button class="btn" id="rppm-close-panel">Paneli kapat</button>' +
      "</div>" +
      '<div class="muted" style="margin-top:8px">Kısayol: Alt+Shift+R paneli açar. Yorumlarda j/k gezinir, z katlar.</div>' +
      "</div>";

    container.querySelectorAll("input[data-setting]").forEach((input) => {
      input.addEventListener("change", async () => {
        await RPPM.set(input.dataset.setting, input.checked);
        RPPM.refreshAll();
      });
    });

    const themeSelect = container.querySelector("#rppm-theme");
    themeSelect.addEventListener("change", async () => {
      await RPPM.set("extras.theme", themeSelect.value);
      RPPM.refreshAll();
    });

    container.querySelector("#rppm-open-options").addEventListener("click", () => {
      browser.runtime.sendMessage({ type: "rppm:openOptions" }).catch(() => {
        try {
          browser.runtime.openOptionsPage();
        } catch (err) {
          /* ignore */
        }
      });
    });
    container.querySelector("#rppm-toggle-old").addEventListener("click", () => {
      const url = new URL(location.href);
      url.hostname = RPPM.isOld() ? "www.reddit.com" : "old.reddit.com";
      location.href = url.toString();
    });
    container.querySelector("#rppm-close-panel").addEventListener("click", close);
  }

  // Bridge to the mod module's renderer (registered by modtools.js).
  RPPM.modtoolsRender = function (container) {
    const mod = RPPM.moduleByName("mod");
    if (mod && mod.render) return mod.render(container);
    container.innerHTML = '<div class="section"><div class="muted">Moderatör modülü yüklü değil.</div></div>';
    return Promise.resolve();
  };

  RPPM.panel = { open, close, toggle, toast, renderTab };

  // Expose a keyboard shortcut even if the panel module loads before boot ends.
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && host && host.style.display !== "none") close();
    },
    true
  );
})();
