/* Reddit Pro Plus Max - settings store
 * Loaded in every content script and in the extension pages.
 * Keeps a single source of truth for defaults and deep-merges stored values.
 */
(function () {
  "use strict";

  if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
    globalThis.browser = globalThis.chrome;
  }

  const RPPM = (window.RPPM = window.RPPM || {});

  const DEFAULTS = {
    enabled: true,

    simplify: {
      enabled: true,
      hideSidebar: true,
      hideRightRail: true,
      hideAwards: true,
      hideAvatars: false,
      compact: false,
      hideKarma: false,
      hideCreatePost: false,
      hideHeader: false,
      hideChat: true,
      hideRecommendations: true,
      hideTrending: true,
      hidePremium: true,
      hideNSFWBlur: false,
      disableAutoplay: true,
      wideFeed: false,
      hidePostFlair: false,
      hideUsername: false,
      hideVoteButtons: false,
      hideCommentCount: false
    },

    ads: {
      enabled: true,
      hidePromoted: true,
      hideSidebarAds: true,
      hideAdComments: false,
      removeInsteadOfHide: false
    },

    comments: {
      enabled: true,
      buttons: true,
      keyboard: true,
      autoCollapseDepth: 0,
      hideChildCount: false,
      highlightCurrent: true
    },

    saved: {
      enabled: true,
      pageSize: 100,
      maxPages: 20,
      cacheLimit: 5000,
      autoSync: false
    },

    cleanup: {
      enabled: true,
      rateMs: 1200,
      maxPages: 20
    },

    mod: {
      enabled: true,
      quickActions: true,
      hoverCard: true,
      userNotes: true,
      modqueueHelpers: true,
      confirmRemove: true
    },

    extras: {
      enabled: true,
      fixTranslate: true,
      directImages: true,
      nsfwUnblur: false,
      oldRedditButton: true,
      subredditFilter: true,
      keywordFilter: true,
      userFilter: true,
      theme: "auto",
      subredditBlocklist: [],
      keywordBlocklist: [],
      userBlocklist: [],
      flairBlocklist: [],
      userTags: {},
      showTags: true,
      openLinksNewTab: false,
      scrollToTopButton: true
    },

    stats: {
      adsBlocked: 0,
      commentsCollapsed: 0,
      postsFiltered: 0,
      deleted: 0
    }
  };

  RPPM.DEFAULTS = DEFAULTS;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function merge(base, extra) {
    if (Array.isArray(base)) {
      return Array.isArray(extra) ? extra.slice() : base.slice();
    }
    const out = Object.assign({}, base);
    if (!extra || typeof extra !== "object") return out;
    for (const key of Object.keys(extra)) {
      const b = base ? base[key] : undefined;
      const e = extra[key];
      if (Array.isArray(e)) {
        out[key] = e.slice();
      } else if (e && typeof e === "object") {
        out[key] = merge(b && typeof b === "object" ? b : {}, e);
      } else if (e !== undefined) {
        out[key] = e;
      }
    }
    return out;
  }

  RPPM.settings = clone(DEFAULTS);
  RPPM.bus = RPPM.bus || new EventTarget();
  RPPM._settingsLoaded = false;

  RPPM.get = function (path, fallback) {
    let cur = RPPM.settings;
    for (const part of String(path).split(".")) {
      if (cur == null || typeof cur !== "object" || !(part in cur)) return fallback;
      cur = cur[part];
    }
    return cur === undefined ? fallback : cur;
  };

  RPPM.set = function (path, value) {
    const parts = String(path).split(".");
    let cur = RPPM.settings;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
    return RPPM.save();
  };

  RPPM.load = async function () {
    let stored = null;
    try {
      const got = await browser.storage.local.get("settings");
      stored = got && got.settings;
    } catch (err) {
      console.warn("[RPPM] settings read failed", err);
    }
    RPPM.settings = merge(DEFAULTS, stored || {});
    RPPM._settingsLoaded = true;
    return RPPM.settings;
  };

  RPPM.save = async function () {
    try {
      await browser.storage.local.set({ settings: RPPM.settings });
    } catch (err) {
      console.warn("[RPPM] settings write failed", err);
    }
    return RPPM.settings;
  };

  RPPM.reset = async function () {
    RPPM.settings = clone(DEFAULTS);
    await RPPM.save();
    return RPPM.settings;
  };

  RPPM.exportSettings = function () {
    return JSON.stringify(RPPM.settings, null, 2);
  };

  RPPM.importSettings = async function (json) {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    if (!parsed || typeof parsed !== "object") throw new Error("Geçersiz ayar dosyası");
    RPPM.settings = merge(DEFAULTS, parsed);
    await RPPM.save();
    return RPPM.settings;
  };

  RPPM.onSettingsChanged = function (callback) {
    const handler = () => callback(RPPM.settings);
    RPPM.bus.addEventListener("settings", handler);
    return () => RPPM.bus.removeEventListener("settings", handler);
  };

  RPPM.broadcastSettings = function () {
    RPPM.bus.dispatchEvent(new Event("settings"));
  };

  // Listen for changes made from the popup / options page / another tab.
  try {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes.settings) return;
      RPPM.settings = merge(DEFAULTS, changes.settings.newValue || {});
      RPPM.broadcastSettings();
    });
  } catch (err) {
    /* extension pages always have storage; ignore */
  }
})();
