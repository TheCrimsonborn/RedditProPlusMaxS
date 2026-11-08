/* Reddit Pro Plus Max - core bootstrap */
(function () {
  "use strict";

  const RPPM = window.RPPM;
  RPPM.modules = RPPM.modules || [];

  RPPM.registerModule = function (name, module) {
    RPPM.modules.push(Object.assign({ name }, module));
  };

  const CLASS_MAP = {
    "simplify.hideSidebar": "rppm-hide-sidebar",
    "simplify.hideRightRail": "rppm-hide-rail",
    "simplify.hideAwards": "rppm-hide-awards",
    "simplify.hideAvatars": "rppm-hide-avatars",
    "simplify.compact": "rppm-compact",
    "simplify.hideKarma": "rppm-hide-karma",
    "simplify.hideCreatePost": "rppm-hide-create",
    "simplify.hideHeader": "rppm-hide-header",
    "simplify.hideChat": "rppm-hide-chat",
    "simplify.hideRecommendations": "rppm-hide-recs",
    "simplify.hideTrending": "rppm-hide-trending",
    "simplify.hidePremium": "rppm-hide-premium",
    "simplify.hideNSFWBlur": "rppm-unblur",
    "simplify.wideFeed": "rppm-wide",
    "simplify.hidePostFlair": "rppm-hide-flair",
    "simplify.hideUsername": "rppm-hide-username",
    "simplify.hideVoteButtons": "rppm-hide-votes",
    "simplify.hideCommentCount": "rppm-hide-comment-count",
    "ads.hidePromoted": "rppm-hide-promoted",
    "ads.hideSidebarAds": "rppm-hide-sidebar-ads",
    "comments.hideChildCount": "rppm-hide-child-count",
    "extras.nsfwUnblur": "rppm-unblur"
  };

  RPPM.applyClasses = function () {
    const html = document.documentElement;
    const s = RPPM.settings;
    if (!html) return;

    html.classList.toggle("rppm-on", !!s.enabled);
    html.classList.toggle("rppm-old", RPPM.isOld());
    html.classList.toggle("rppm-new", !RPPM.isOld());

    for (const [path, cls] of Object.entries(CLASS_MAP)) {
      html.classList.toggle(cls, !!RPPM.get(path));
    }

    const theme = RPPM.get("extras.theme", "auto");
    html.classList.toggle("rppm-theme-dark", theme === "dark");
    html.classList.toggle("rppm-theme-amoled", theme === "amoled");
  };

  RPPM.isModuleOn = function (name) {
    if (!RPPM.settings.enabled) return false;
    const mod = RPPM.settings[name];
    return !mod || mod.enabled !== false;
  };

  RPPM.moduleByName = function (name) {
    return RPPM.modules.find((m) => m.name === name) || null;
  };

  RPPM.refreshAll = function () {
    RPPM.applyClasses();
    for (const mod of RPPM.modules) {
      if (mod.onSettings && RPPM.isModuleOn(mod.name)) {
        try {
          mod.onSettings(RPPM.settings);
        } catch (err) {
          console.warn("[RPPM] onSettings " + mod.name, err);
        }
      }
    }
  };

  async function boot() {
    await RPPM.load();
    RPPM.applyClasses();

    await new Promise((resolve) => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", resolve, { once: true });
      } else {
        resolve();
      }
    });

    for (const mod of RPPM.modules) {
      if (mod.init && RPPM.isModuleOn(mod.name)) {
        try {
          mod.init(RPPM.settings);
        } catch (err) {
          console.warn("[RPPM] init " + mod.name, err);
        }
      }
    }

    RPPM.ready = true;
    RPPM.bus.dispatchEvent(new Event("ready"));
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || typeof message.type !== "string") return undefined;

    if (message.type === "rppm:openPanel") {
      if (RPPM.panel) {
        RPPM.panel.open(message.panel || "settings");
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, reason: "panel-not-ready" });
    }

    if (message.type === "rppm:getInfo") {
      return Promise.resolve({
        ok: true,
        url: location.href,
        host: location.hostname,
        subreddit: RPPM.currentSubreddit(),
        postId: RPPM.currentPostId(),
        isOld: RPPM.isOld(),
        user: (RPPM.me && RPPM.me.name) || null,
        ready: !!RPPM.ready
      });
    }

    if (message.type === "rppm:setSetting") {
      return RPPM.set(message.path, message.value).then(() => {
        RPPM.refreshAll();
        RPPM.broadcastSettings();
        return { ok: true, value: RPPM.get(message.path) };
      });
    }

    if (message.type === "rppm:reloadSettings") {
      return RPPM.load().then(() => {
        RPPM.refreshAll();
        return { ok: true };
      });
    }

    if (message.type === "rppm:toggleOld") {
      const target = RPPM.isOld()
        ? location.href.replace("old.reddit.com", "www.reddit.com")
        : location.href.replace("www.reddit.com", "old.reddit.com");
      location.href = target;
      return Promise.resolve({ ok: true });
    }

    return undefined;
  });

  RPPM.bus.addEventListener("settings", () => {
    RPPM.applyClasses();
    for (const mod of RPPM.modules) {
      if (!mod.onSettings) continue;
      if (!RPPM.isModuleOn(mod.name)) continue;
      try {
        mod.onSettings(RPPM.settings);
      } catch (err) {
        console.warn("[RPPM] onSettings " + mod.name, err);
      }
    }
  });

  // Alt+Shift+R opens the panel on any Reddit page.
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey && event.shiftKey && (event.key === "R" || event.key === "r")) {
        event.preventDefault();
        if (RPPM.panel) RPPM.panel.toggle();
      }
    },
    true
  );

  boot().catch((err) => console.warn("[RPPM] boot failed", err));
})();
