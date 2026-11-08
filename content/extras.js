/* Reddit Pro Plus Max - extras: translate fix, direct images, filters, tags */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  let observer = null;
  let oldNewButton = null;
  let topButton = null;
  let scrollHandler = null;

  /* ---------------- translate fix ---------------- */

  function stripTranslateParam() {
    try {
      const url = new URL(location.href);
      let changed = false;
      for (const key of ["tl", "cl_lang"]) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed) history.replaceState(null, "", url.toString());
    } catch (err) {
      /* ignore */
    }
  }

  function onLinkClick(event) {
    if (!RPPM.get("extras.fixTranslate")) return;
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.indexOf("tl=") === -1) return;
    try {
      const url = new URL(href, location.href);
      if (!url.searchParams.has("tl")) return;
      url.searchParams.delete("tl");
      event.preventDefault();
      location.href = url.toString();
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------------- direct images ---------------- */

  function directImageUrl(href) {
    try {
      const url = new URL(href, location.href);
      if (url.pathname === "/media" && url.searchParams.get("url")) {
        return url.searchParams.get("url");
      }
      if (/^(i|preview|external-preview)\.redd\.it$/i.test(url.hostname)) {
        return url.toString();
      }
    } catch (err) {
      /* ignore */
    }
    return null;
  }

  function rewriteImageLinks(root) {
    if (!RPPM.get("extras.directImages")) return;
    const scope = root && root.querySelectorAll ? root : document;
    const links = scope.querySelectorAll('a[href*="/media?url="]');
    for (const link of links) {
      const direct = directImageUrl(link.getAttribute("href"));
      if (direct) {
        link.setAttribute("href", direct);
        link.setAttribute("data-rppm-direct", "1");
      }
    }
  }



  /* ---------------- filters ---------------- */

  function normalise(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean);
  }

  function matches(value, list) {
    if (!value) return false;
    const v = String(value).toLowerCase();
    return list.some((entry) => {
      if (entry.startsWith("/") && entry.endsWith("/") && entry.length > 2) {
        try {
          return new RegExp(entry.slice(1, -1), "i").test(value);
        } catch (err) {
          return false;
        }
      }
      return v === entry || v.includes(entry);
    });
  }

  function postInfo(el) {
    if (el.tagName === "SHREDDIT-POST") {
      const sub = (el.getAttribute("subreddit") || "").replace(/^r\//i, "");
      const title = el.getAttribute("post-title") || "";
      const author = el.getAttribute("author") || "";
      const flair = el.getAttribute("flair-text") || el.getAttribute("post-flair") || "";
      return { sub, title, author, flair };
    }
    if (el.classList && el.classList.contains("thing")) {
      const sub = el.getAttribute("data-subreddit") || "";
      const titleEl = el.querySelector("a.title");
      const flairEl = el.querySelector(".linkflairlabel");
      return {
        sub,
        title: titleEl ? titleEl.textContent : "",
        author: el.getAttribute("data-author") || "",
        flair: flairEl ? flairEl.textContent : ""
      };
    }
    return null;
  }

  function applyFilters() {
    const subs = normalise(RPPM.get("extras.subredditBlocklist", []));
    const keywords = normalise(RPPM.get("extras.keywordBlocklist", []));
    const users = normalise(RPPM.get("extras.userBlocklist", []));
    const flairs = normalise(RPPM.get("extras.flairBlocklist", []));

    const active =
      RPPM.get("extras.subredditFilter") && subs.length ||
      RPPM.get("extras.keywordFilter") && keywords.length ||
      RPPM.get("extras.userFilter") && users.length ||
      flairs.length;

    const posts = RPPM.$$("shreddit-post, .thing");
    for (const post of posts) {
      const info = postInfo(post);
      if (!info) continue;
      let hide = false;
      if (active) {
        if (RPPM.get("extras.subredditFilter") && matches(info.sub, subs)) hide = true;
        if (!hide && RPPM.get("extras.keywordFilter") && matches(info.title, keywords)) hide = true;
        if (!hide && RPPM.get("extras.userFilter") && matches(info.author, users)) hide = true;
        if (!hide && flairs.length && matches(info.flair, flairs)) hide = true;
      }
      if (hide && !post.classList.contains("rppm-filtered")) {
        post.classList.add("rppm-filtered");
        RPPM.stats.bump("postsFiltered", 1);
      } else if (!hide && post.classList.contains("rppm-filtered")) {
        post.classList.remove("rppm-filtered");
      }
    }
  }

  /* ---------------- user tags ---------------- */

  function applyTags(root) {
    if (!RPPM.get("extras.showTags")) return;
    const tags = RPPM.get("extras.userTags", {}) || {};
    const scope = root && root.querySelectorAll ? root : document;
    const links = scope.querySelectorAll('a[href*="/user/"]');
    for (const link of links) {
      const m = (link.getAttribute("href") || "").match(/\/user\/([^/?#]+)/);
      if (!m) continue;
      const user = decodeURIComponent(m[1]);
      const tag = tags[user] || tags[user.toLowerCase()];
      if (!tag) continue;
      if (link.nextElementSibling && link.nextElementSibling.classList.contains("rppm-user-tag")) continue;
      const span = document.createElement("span");
      span.className = "rppm-user-tag";
      span.textContent = tag;
      link.insertAdjacentElement("afterend", span);
    }
  }

  /* ---------------- floating buttons ---------------- */

  function makeOldNewButton() {
    if (!RPPM.get("extras.oldRedditButton")) {
      if (oldNewButton) oldNewButton.remove();
      oldNewButton = null;
      return;
    }
    if (oldNewButton && oldNewButton.isConnected) {
      oldNewButton.textContent = RPPM.isOld() ? "yeni Reddit" : "old Reddit";
      return;
    }
    oldNewButton = document.createElement("button");
    oldNewButton.type = "button";
    oldNewButton.className = "rppm-float-btn";
    oldNewButton.style.bottom = "16px";
    oldNewButton.style.right = "16px";
    oldNewButton.textContent = RPPM.isOld() ? "yeni Reddit" : "old Reddit";
    oldNewButton.title = "Reddit arayüzünü değiştir";
    oldNewButton.addEventListener("click", () => {
      const url = new URL(location.href);
      if (RPPM.isOld()) {
        url.hostname = "www.reddit.com";
      } else {
        url.hostname = "old.reddit.com";
      }
      location.href = url.toString();
    });
    document.documentElement.appendChild(oldNewButton);
  }

  function makeTopButton() {
    if (!RPPM.get("extras.scrollToTopButton")) {
      if (topButton) topButton.remove();
      topButton = null;
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
        scrollHandler = null;
      }
      return;
    }
    if (!topButton) {
      topButton = document.createElement("button");
      topButton.type = "button";
      topButton.className = "rppm-float-btn";
      topButton.style.left = "16px";
      topButton.style.right = "auto";
      topButton.textContent = "↑";
      topButton.title = "Yukarı çık";
      topButton.style.display = "none";
      topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
      document.documentElement.appendChild(topButton);
    }
    if (!scrollHandler) {
      scrollHandler = () => {
        if (!topButton) return;
        topButton.style.display = window.scrollY > 600 ? "inline-flex" : "none";
      };
    }
    window.removeEventListener("scroll", scrollHandler);
    window.addEventListener("scroll", scrollHandler, { passive: true });
    scrollHandler();
  }

  /* ---------------- NSFW unblur ---------------- */

  function unblur(root) {
    if (!RPPM.get("extras.nsfwUnblur")) return;
    const scope = root && root.querySelectorAll ? root : document;
    const nodes = scope.querySelectorAll(
      'shreddit-blurred-container, [data-testid="blurred-container"], .nsfw-blur, .blurred'
    );
    for (const node of nodes) {
      node.removeAttribute("blurred");
      node.classList.remove("blurred");
      node.style.filter = "none";
      node.style.backdropFilter = "none";
    }
  }

  function applyAll(root) {
    rewriteImageLinks(root);
    applyFilters();
    applyTags(root);
    unblur(root);
    makeOldNewButton();
    makeTopButton();
  }

  RPPM.registerModule("extras", {
    init() {
      if (RPPM.get("extras.fixTranslate")) {
        stripTranslateParam();
        document.addEventListener("click", onLinkClick, true);
      }
      applyAll(document);
      observer = RPPM.observeDeep(
        RPPM.debounce(() => applyAll(document), 400),
        { throttle: 500 }
      );
    },
    onSettings() {
      if (RPPM.get("extras.fixTranslate")) {
        stripTranslateParam();
        document.addEventListener("click", onLinkClick, true);
      } else {
        document.removeEventListener("click", onLinkClick, true);
      }
      applyAll(document);
    },
    destroy() {
      if (observer) observer.disconnect();
      document.removeEventListener("click", onLinkClick, true);
      if (oldNewButton) oldNewButton.remove();
      if (topButton) topButton.remove();
    }
  });
})();
