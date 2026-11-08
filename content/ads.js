/* Reddit Pro Plus Max - promoted post / ad blocker */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  const NEW_SELECTORS = [
    "shreddit-ad-post",
    '[data-testid="promoted-post"]',
    "[data-promoted='true']",
    "[promoted]",
    "shreddit-post[promoted]",
    "shreddit-post[is-promoted]",
    "shreddit-post[data-promoted]",
    "shreddit-post[ad-id]",
    "shreddit-post[data-ad-id]",
    "shreddit-post[sponsored]"
  ];

  const OLD_SELECTORS = [
    "#siteTable > .thing.promoted",
    ".thing.promoted",
    ".promotedlink",
    ".promoted",
    ".ad-container",
    "#ad-frame",
    '[data-testid="sidebar-ad"]'
  ];

  const seen = new WeakSet();
  let observer = null;

  function looksPromoted(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.matches && el.matches(NEW_SELECTORS.join(","))) return true;
    if (el.matches && el.matches(OLD_SELECTORS.join(","))) return true;

    if (el.tagName === "SHREDDIT-POST") {
      for (const attr of ["promoted", "is-promoted", "sponsored", "ad-id", "data-ad-id"]) {
        if (el.hasAttribute(attr)) return true;
      }
      const label = (el.getAttribute("promoted-label") || "").toLowerCase();
      if (label) return true;
    }

    return false;
  }

  function block(el) {
    if (!el || seen.has(el)) return;
    if (!looksPromoted(el)) return;
    seen.add(el);
    el.setAttribute("data-rppm-ad", "1");
    if (RPPM.get("ads.removeInsteadOfHide")) {
      el.remove();
    }
    RPPM.stats.bump("adsBlocked", 1);
  }

  function sweep(root) {
    if (!RPPM.get("ads.enabled") || !RPPM.get("ads.hidePromoted")) return;
    const scope = root && root.querySelectorAll ? root : document;

    for (const selector of NEW_SELECTORS.concat(OLD_SELECTORS)) {
      try {
        scope.querySelectorAll(selector).forEach(block);
      } catch (err) {
        /* invalid selector in an old browser */
      }
    }

    if (scope.matches && looksPromoted(scope)) block(scope);

    if (RPPM.get("ads.hideSidebarAds")) {
      scope.querySelectorAll('[data-testid="sidebar-ad"], .ad-container, #ad-frame').forEach(block);
    }
  }

  RPPM.registerModule("ads", {
    init() {
      sweep(document);
      observer = RPPM.observeDeep(
        RPPM.debounce(() => sweep(document), 300),
        { throttle: 400 }
      );
    },
    onSettings() {
      sweep(document);
    },
    destroy() {
      if (observer) observer.disconnect();
    }
  });
})();
