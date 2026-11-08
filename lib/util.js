/* Reddit Pro Plus Max - shared utilities */
(function () {
  "use strict";

  const RPPM = (window.RPPM = window.RPPM || {});

  RPPM.$ = (selector, root) => (root || document).querySelector(selector);
  RPPM.$$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  RPPM.isOld = () => location.hostname === "old.reddit.com";
  RPPM.isNew = () => !RPPM.isOld();
  RPPM.isModPage = () => /\/about\/(modqueue|reports|spam|unmoderated|edited|modlog)/.test(location.pathname);

  RPPM.currentSubreddit = function () {
    const m = location.pathname.match(/^\/r\/([^/]+)/i);
    if (m) return decodeURIComponent(m[1]);
    const q = new URLSearchParams(location.search).get("subreddit");
    return q || null;
  };

  RPPM.currentPostId = function () {
    const m = location.pathname.match(/\/comments\/([a-z0-9]+)/i);
    return m ? m[1] : null;
  };

  RPPM.fullnameFromUrl = function () {
    const id = RPPM.currentPostId();
    return id ? "t3_" + id : null;
  };

  RPPM.currentPostFullname = function () {
    return RPPM.fullnameFromUrl();
  };

  RPPM.fullnameFromThing = function (el) {
    if (!el) return null;
    if (el.dataset && el.dataset.fullname) return el.dataset.fullname;
    const attrs = ["thingid", "data-fullname", "fullname", "id"];
    for (const a of attrs) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && /^t[0-9]_[a-z0-9]+$/i.test(v)) return v;
    }
    const permalink = el.getAttribute && el.getAttribute("permalink");
    if (permalink) {
      const m = permalink.match(/\/comments\/([a-z0-9]+)/i);
      if (m) return "t3_" + m[1];
    }
    return null;
  };

  RPPM.userFromThing = function (el) {
    if (!el) return null;
    const attrs = ["author", "data-author", "user"];
    for (const a of attrs) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && v !== "[deleted]" && v !== "AutoModerator") return v;
    }
    const a = el.querySelector && el.querySelector('a[href^="/user/"], a[href*="/user/"]');
    if (a) {
      const m = a.getAttribute("href").match(/\/user\/([^/?#]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  };

  RPPM.subredditFromThing = function (el) {
    if (!el) return null;
    const target = (el.matches && (el.matches("shreddit-post, .thing") || el.matches("shreddit-comment, .comment")))
      ? el
      : (el.closest && (el.closest("shreddit-post, .thing") || el.closest("shreddit-comment, .comment"))) || el;

    const attrs = [
      "subreddit-prefixed-name",
      "subreddit",
      "data-subreddit",
      "data-subreddit-name",
      "subreddit-prefixed",
      "data-subreddit-prefixed-name"
    ];
    for (const a of attrs) {
      const v = target.getAttribute && target.getAttribute(a);
      if (v) {
        const cleaned = v.replace(/^r\//i, "").trim().toLowerCase();
        if (cleaned && cleaned !== "all" && cleaned !== "popular") return cleaned;
      }
    }
    const a = target.querySelector && target.querySelector('a[href^="/r/"], a[href*="/r/"]');
    if (a) {
      const m = (a.getAttribute("href") || "").match(/\/r\/([^/?#]+)/i);
      if (m) {
        const sub = decodeURIComponent(m[1]).toLowerCase();
        if (sub !== "all" && sub !== "popular") return sub;
      }
    }
    const current = RPPM.currentSubreddit();
    return current ? current.toLowerCase() : null;
  };

  RPPM.debounce = function (fn, wait) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait || 100);
    };
  };

  RPPM.throttle = function (fn, wait) {
    let last = 0;
    let timer = null;
    return function (...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        clearTimeout(timer);
        timer = null;
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  };

  RPPM.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  RPPM.escapeHtml = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  RPPM.formatNumber = function (n) {
    if (n == null || isNaN(n)) return "0";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  };

  RPPM.formatRelative = function (unixSeconds) {
    if (!unixSeconds) return "";
    const diff = Math.floor(Date.now() / 1000 - unixSeconds);
    if (diff < 60) return "az önce";
    if (diff < 3600) return Math.floor(diff / 60) + " dk";
    if (diff < 86400) return Math.floor(diff / 3600) + " sa";
    if (diff < 2592000) return Math.floor(diff / 86400) + " gün";
    if (diff < 31536000) return Math.floor(diff / 2592000) + " ay";
    return Math.floor(diff / 31536000) + " yıl";
  };

  RPPM.formatDate = function (unixSeconds) {
    if (!unixSeconds) return "";
    try {
      return new Date(unixSeconds * 1000).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (err) {
      return "";
    }
  };

  RPPM.onReady = function (fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  RPPM.waitFor = function (selector, timeout, root) {
    return new Promise((resolve) => {
      const found = (root || document).querySelector(selector);
      if (found) return resolve(found);
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(value);
      };
      const observer = new MutationObserver(() => {
        const el = (root || document).querySelector(selector);
        if (el) finish(el);
      });
      observer.observe(root || document, { childList: true, subtree: true });
      const timer = setTimeout(() => finish(null), timeout || 15000);
    });
  };

  /* ------------------------------------------------------------------ */
  /* Deep DOM helpers (Reddit's new UI uses open shadow roots)           */
  /* ------------------------------------------------------------------ */

  RPPM.shadow = {
    css: new Map(),
    roots: new Set(),

    scan(root) {
      const base = root || document;
      if (base.shadowRoot) {
        this.roots.add(base.shadowRoot);
        this.apply(base.shadowRoot);
      }
      const all = base.querySelectorAll ? base.querySelectorAll("*") : [];
      for (const el of all) {
        if (el.shadowRoot) {
          this.roots.add(el.shadowRoot);
          this.apply(el.shadowRoot);
        }
      }
    },

    set(id, css) {
      this.css.set(id, css);
      for (const shadowRoot of this.roots) this.apply(shadowRoot);
    },

    apply(shadowRoot) {
      if (!shadowRoot || !shadowRoot.querySelector) return;
      for (const [id, css] of this.css) {
        let style = shadowRoot.querySelector('style[data-rppm="' + id + '"]');
        if (!style) {
          style = document.createElement("style");
          style.setAttribute("data-rppm", id);
          (shadowRoot.head || shadowRoot).appendChild(style);
        }
        if (style.textContent !== css) style.textContent = css;
      }
    }
  };

  RPPM.observeDeep = function (callback, options) {
    const observed = new WeakSet();
    const observers = [];
    const throttleMs = (options && options.throttle) || 250;
    let pendingScan = null;
    const pendingNodes = new Set();

    const run = (node) => {
      try {
        callback(node);
      } catch (err) {
        console.warn("[RPPM] deep observer callback", err);
      }
    };

    const scheduleScan = (node) => {
      pendingNodes.add(node);
      if (pendingScan) return;
      pendingScan = setTimeout(() => {
        pendingScan = null;
        for (const pending of pendingNodes) {
          RPPM.shadow.scan(pending);
          run(pending);
        }
        pendingNodes.clear();
      }, throttleMs);
    };

    const attach = (root) => {
      if (!root || observed.has(root)) return;
      observed.add(root);
      const mo = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            run(node);
            if (node.shadowRoot) attach(node.shadowRoot);
            if (node.querySelectorAll) {
              for (const el of node.querySelectorAll("*")) {
                if (el.shadowRoot) attach(el.shadowRoot);
              }
            }
            scheduleScan(node);
          }
        }
      });
      try {
        mo.observe(root, { childList: true, subtree: true });
      } catch (err) {
        return;
      }
      observers.push(mo);
      if (root.shadowRoot) attach(root.shadowRoot);
    };

    attach(document);
    RPPM.shadow.scan(document);
    run(document);

    return {
      disconnect() {
        observers.forEach((o) => o.disconnect());
        if (pendingScan) clearTimeout(pendingScan);
      },
      refresh() {
        RPPM.shadow.scan(document);
        run(document);
      }
    };
  };

  /* ------------------------------------------------------------------ */
  /* Reddit API                                                          */
  /* ------------------------------------------------------------------ */

  RPPM.origin = () => location.origin;

  RPPM.apiGet = async function (path, params) {
    let url = path;
    if (!/^https?:/i.test(url)) {
      url = RPPM.origin() + (url.startsWith("/") ? url : "/" + url);
    }
    if (params) {
      const u = new URL(url);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") u.searchParams.set(key, value);
      }
      url = u.toString();
    }
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw Object.assign(new Error("Reddit JSON bekleniyordu (" + res.status + ")"), {
        status: res.status,
        body: text.slice(0, 300)
      });
    }
    if (!res.ok) {
      throw Object.assign(new Error("Reddit API " + res.status), { status: res.status, json });
    }
    return json;
  };

  RPPM.bgFetch = async function (url) {
    const res = await browser.runtime.sendMessage({ type: "rppm:fetch", url });
    if (!res || !res.ok) {
      throw new Error("Arka plan isteği başarısız: " + (res && res.status));
    }
    try {
      return JSON.parse(res.text);
    } catch (err) {
      throw new Error("Arka plan yanıtı JSON değil");
    }
  };

  RPPM.getMe = function (force) {
    if (!force && RPPM.me) return Promise.resolve(RPPM.me);
    if (!force && RPPM._mePromise) return RPPM._mePromise;
    RPPM._mePromise = (async () => {
      const urls = [RPPM.origin() + "/api/me.json"];
      if (location.hostname !== "old.reddit.com") urls.push("https://old.reddit.com/api/me.json");
      for (const url of urls) {
        try {
          const json = url.startsWith(RPPM.origin())
            ? await RPPM.apiGet(url)
            : await RPPM.bgFetch(url);
          if (json && json.data && json.data.name) {
            RPPM.me = json.data;
            return json.data;
          }
        } catch (err) {
          /* try next */
        }
      }
      throw new Error("Reddit oturumu bulunamadı. Giriş yaptığınızdan emin olun.");
    })();
    return RPPM._mePromise;
  };

  RPPM.apiPost = async function (path, params) {
    const me = await RPPM.getMe();
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null) body.set(key, String(value));
    }
    body.set("uh", me.modhash || "");
    body.set("api_type", "json");

    const url = /^https?:/i.test(path)
      ? path
      : RPPM.origin() + (path.startsWith("/") ? path : "/" + path);

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: body.toString()
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (err) {
      json = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      throw Object.assign(new Error("Reddit API " + res.status), { status: res.status, json });
    }
    return json;
  };

  RPPM.getUserAbout = async function (username) {
    const json = await RPPM.apiGet("/user/" + encodeURIComponent(username) + "/about.json", {
      raw_json: 1
    });
    return json.data;
  };

  RPPM.getUserOverview = async function (username, limit) {
    const json = await RPPM.apiGet("/user/" + encodeURIComponent(username) + "/overview.json", {
      limit: limit || 10,
      sort: "new",
      raw_json: 1
    });
    return (json.data && json.data.children) || [];
  };

  /* ------------------------------------------------------------------ */
  /* Tiny UI helpers (page-level, not the shadow panel)                  */
  /* ------------------------------------------------------------------ */

  RPPM.toast = function (message, kind) {
    if (RPPM.panel && RPPM.panel.toast) {
      RPPM.panel.toast(message, kind);
      return;
    }
    let host = document.getElementById("rppm-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "rppm-toast-host";
      document.documentElement.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "rppm-toast rppm-toast-" + (kind || "info");
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add("rppm-toast-out");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  };

  RPPM.stats = {
    async bump(key, amount) {
      try {
        const got = await browser.storage.local.get("stats");
        const stats = got.stats || {};
        stats[key] = (stats[key] || 0) + (amount == null ? 1 : amount);
        await browser.storage.local.set({ stats });
      } catch (err) {
        /* non-critical */
      }
    }
  };

  RPPM.log = function (...args) {
    if (RPPM.get("debug")) console.log("[RPPM]", ...args);
  };
})();
