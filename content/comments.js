/* Reddit Pro Plus Max S - comment collapser + keyboard navigation */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  let observer = null;
  let currentIndex = -1;

  const COLLAPSE_SHADOW_CSS = `
    .rppm-collapse-btn {
      appearance: none;
      border: 1px solid rgba(255, 69, 0, 0.45);
      background: rgba(255, 69, 0, 0.12);
      color: #ff4500;
      border-radius: 6px;
      font: 700 12px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      padding: 2px 6px;
      margin: 0 4px;
      cursor: pointer;
      vertical-align: middle;
      z-index: 10;
      position: static !important;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      line-height: 1;
      flex-shrink: 0;
    }
    .rppm-collapse-btn:hover {
      background: #ff4500;
      color: #fff;
    }
    .rppm-collapse-btn[data-collapsed="1"] {
      background: rgba(255, 69, 0, 0.35);
      color: #fff;
    }
    :host([rppm-collapsed]) [slot="comment"],
    :host([rppm-collapsed]) [data-testid="comment-body"],
    :host([rppm-collapsed]) [part="comment-body"],
    :host([rppm-collapsed]) [data-testid="comment"],
    :host([rppm-collapsed]) details > *:not(summary),
    :host([collapsed]) [slot="comment"],
    :host([collapsed]) [data-testid="comment-body"],
    :host([collapsed]) [part="comment-body"],
    :host([collapsed]) [data-testid="comment"],
    :host([collapsed]) details > *:not(summary) {
      display: none !important;
    }
  `;

  function isNewComment(el) {
    return el && el.tagName === "SHREDDIT-COMMENT";
  }

  function getComments() {
    if (RPPM.isOld()) {
      return RPPM.$$(".commentarea .comment");
    }
    return RPPM.$$("shreddit-comment");
  }

  function depthOf(el) {
    if (!RPPM.isOld()) {
      const d = parseInt(el.getAttribute("depth") || "0", 10);
      return isNaN(d) ? 0 : d;
    }
    let depth = 0;
    let node = el.parentElement;
    while (node) {
      if (node.classList && node.classList.contains("comment")) depth++;
      node = node.parentElement;
    }
    return depth;
  }

  function findButton(el) {
    if (!el) return null;
    return (
      (el.shadowRoot && el.shadowRoot.querySelector(".rppm-collapse-btn")) ||
      el.querySelector(".rppm-collapse-btn")
    );
  }

  function makeButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rppm-collapse-btn";
    button.textContent = "−";
    button.title = "Yorumu katla / aç (Z)";
    button.setAttribute("aria-label", "Yorumu katla");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      let host = button.closest("shreddit-comment, .comment");
      if (!host && button.getRootNode) {
        const root = button.getRootNode();
        if (root && root.host) host = root.host;
      }
      if (host) toggle(host);
    });
    return button;
  }

  function isCommentCollapsed(el) {
    if (!el) return false;
    if (isNewComment(el)) {
      if (el.shadowRoot) {
        const details = el.shadowRoot.querySelector("details");
        if (details) return !details.hasAttribute("open") && !details.open;
      }
      return el.classList.contains("rppm-collapsed") || el.hasAttribute("collapsed");
    }
    return el.classList.contains("collapsed");
  }

  function syncDetailsListener(el) {
    if (!el || !el.shadowRoot) return;
    const details = el.shadowRoot.querySelector("details");
    if (details && !details.dataset.rppmListener) {
      details.dataset.rppmListener = "1";
      details.addEventListener("toggle", () => {
        const isClosed = !details.hasAttribute("open") && !details.open;
        const btn = findButton(el);
        if (btn) {
          btn.textContent = isClosed ? "+" : "−";
          btn.dataset.collapsed = isClosed ? "1" : "0";
          btn.title = isClosed ? "Yorumu aç (Z)" : "Yorumu katla (Z)";
          btn.setAttribute("aria-label", isClosed ? "Yorumu aç" : "Yorumu katla");
        }
        el.classList.toggle("rppm-collapsed", isClosed);
        if (isClosed) {
          el.setAttribute("collapsed", "");
          el.setAttribute("rppm-collapsed", "");
        } else {
          el.removeAttribute("collapsed");
          el.removeAttribute("rppm-collapsed");
        }
      });
    }
  }

  function findHeaderContainer(el) {
    if (!el) return null;

    // 1. Look for timestamp element in comment (e.g. "42m ago")
    const time = el.querySelector && el.querySelector("faceplate-timeago, time");
    if (time && time.parentElement) {
      const isInsideBody = time.closest && time.closest('[slot="comment"]');
      if (!isInsideBody) return time.parentElement;
    }

    // 2. Look for commentMeta slot in modern Reddit
    const metaSlot = el.querySelector && el.querySelector('[slot="commentMeta"]');
    if (metaSlot) return metaSlot;

    // 3. Look for author link in comment header
    const author = el.querySelector && el.querySelector('a[href^="/user/"], a[href*="/user/"]');
    if (author && author.parentElement) {
      const isInsideBody = author.closest && author.closest('[slot="comment"]');
      if (!isInsideBody) return author.parentElement;
    }

    // 4. Check shadowRoot if present
    if (el.shadowRoot) {
      const summary = el.shadowRoot.querySelector("summary, header, [part='header']");
      if (summary) return summary;
    }

    // 5. Look for comment header or entry tagline
    const header = el.querySelector && el.querySelector('header, .comment-header, .entry .tagline');
    if (header) return header;

    return null;
  }

  function placeInHeader(header, button) {
    if (!header || !button) return;
    const time = header.querySelector("faceplate-timeago, time");
    if (time && time.parentElement === header) {
      time.insertAdjacentElement("afterend", button);
    } else {
      header.appendChild(button);
    }
  }

  function attachButton(el) {
    if (!RPPM.get("comments.buttons")) return;

    let button = findButton(el);
    const header = findHeaderContainer(el);

    if (button) {
      // If button was stuck inside slot="comment" and header is now available, move it to header!
      if (header && button.closest && button.closest('[slot="comment"]')) {
        placeInHeader(header, button);
      }
      syncDetailsListener(el);
      return;
    }

    button = makeButton();
    const collapsed = isCommentCollapsed(el);
    button.textContent = collapsed ? "+" : "−";
    button.dataset.collapsed = collapsed ? "1" : "0";
    button.title = collapsed ? "Yorumu aç (Z)" : "Yorumu katla (Z)";
    button.setAttribute("aria-label", collapsed ? "Yorumu aç" : "Yorumu katla");

    if (isNewComment(el)) {
      if (header) {
        placeInHeader(header, button);
      } else {
        const commentSlot = el.querySelector('[slot="comment"]');
        if (commentSlot) {
          commentSlot.prepend(button);
        } else {
          button.setAttribute("slot", "comment");
          el.appendChild(button);
        }
      }
      syncDetailsListener(el);
    } else {
      const tagline = el.querySelector(".entry .tagline");
      if (tagline) tagline.appendChild(button);
      else el.appendChild(button);
    }
  }

  function setCollapsed(el, collapsed) {
    if (isNewComment(el)) {
      el.classList.toggle("rppm-collapsed", collapsed);
      if (collapsed) {
        el.setAttribute("collapsed", "");
        el.setAttribute("rppm-collapsed", "");
      } else {
        el.removeAttribute("collapsed");
        el.removeAttribute("rppm-collapsed");
      }

      if (el.shadowRoot) {
        const details = el.shadowRoot.querySelector("details");
        if (details) {
          const isOpen = details.hasAttribute("open") || details.open;
          if (collapsed && isOpen) {
            const collapseBtn = details.querySelector(
              "[data-testid='comment-collapse-button'], button[aria-label*='collapse' i], button[aria-label*='katla' i]"
            );
            if (collapseBtn) {
              collapseBtn.click();
            } else {
              details.open = false;
              details.removeAttribute("open");
              details.dispatchEvent(new Event("toggle"));
            }
          } else if (!collapsed && !isOpen) {
            const expandBtn = details.querySelector(
              "[data-testid='comment-collapse-button'], button[aria-label*='expand' i], button[aria-label*='aç' i]"
            );
            if (expandBtn) {
              expandBtn.click();
            } else {
              details.open = true;
              details.setAttribute("open", "");
              details.dispatchEvent(new Event("toggle"));
            }
          }
        }
      }
    } else {
      const isCurrentlyCollapsed = el.classList.contains("collapsed");
      if (isCurrentlyCollapsed !== collapsed) {
        const nativeExpand = el.querySelector(".entry .tagline a.expand");
        if (nativeExpand) {
          nativeExpand.click();
        } else {
          el.classList.toggle("collapsed", collapsed);
        }
      }
    }

    const button = findButton(el);
    if (button) {
      button.textContent = collapsed ? "+" : "−";
      button.dataset.collapsed = collapsed ? "1" : "0";
      button.title = collapsed ? "Yorumu aç (Z)" : "Yorumu katla (Z)";
      button.setAttribute("aria-label", collapsed ? "Yorumu aç" : "Yorumu katla");
    }
  }

  function toggle(el) {
    if (!el) return;
    const collapsed = !isCommentCollapsed(el);
    setCollapsed(el, collapsed);
    if (collapsed) RPPM.stats.bump("commentsCollapsed", 1);
  }

  function collapseAll() {
    const comments = getComments();
    if (!comments.length) return;
    const top = comments.filter((c) => depthOf(c) === 0);
    top.forEach((c) => setCollapsed(c, true));
    RPPM.toast("Tüm üst düzey yorumlar katlandı", "info");
  }

  function expandAll() {
    getComments().forEach((c) => setCollapsed(c, false));
    RPPM.toast("Tüm yorumlar açıldı", "info");
  }

  function autoCollapse(el) {
    const limit = parseInt(RPPM.get("comments.autoCollapseDepth", 0), 10);
    if (!limit || limit < 1) return;
    if (el.dataset.rppmAuto === "1") return;
    el.dataset.rppmAuto = "1";
    if (depthOf(el) >= limit) setCollapsed(el, true);
  }

  function enhance(root) {
    if (!RPPM.get("comments.enabled")) return;
    const scope = root && root.querySelectorAll ? root : document;
    const comments = [];
    if (scope.matches && scope.matches("shreddit-comment, .comment")) comments.push(scope);
    if (scope.querySelectorAll) {
      scope.querySelectorAll("shreddit-comment, .commentarea .comment").forEach((c) => comments.push(c));
    }
    for (const comment of comments) {
      if (!comment.dataset.rppmEnhanced) {
        comment.dataset.rppmEnhanced = "1";
        attachButton(comment);
        autoCollapse(comment);
      } else if (!findButton(comment)) {
        attachButton(comment);
      }
    }
  }

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable ||
      target.getAttribute("role") === "textbox"
    );
  }

  function focusComment(index) {
    const comments = getComments();
    if (!comments.length) return;
    currentIndex = Math.max(0, Math.min(index, comments.length - 1));
    comments.forEach((c) => c.classList.remove("rppm-current-comment"));
    const el = comments[currentIndex];
    el.classList.add("rppm-current-comment");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onKeydown(event) {
    if (!RPPM.get("comments.keyboard")) return;
    if (isTyping(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key;

    if (key === "j") {
      event.preventDefault();
      focusComment(currentIndex + 1);
    } else if (key === "k") {
      event.preventDefault();
      focusComment(currentIndex - 1);
    } else if (key === "z" && !event.shiftKey) {
      const comments = getComments();
      const el = comments[currentIndex];
      if (el) {
        event.preventDefault();
        toggle(el);
      }
    } else if (key === "Z" || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      collapseAll();
    } else if (key === "X" || (key === "x" && event.shiftKey)) {
      event.preventDefault();
      expandAll();
    }
  }

  RPPM.registerModule("comments", {
    init() {
      RPPM.shadow.set("rppm-comments", COLLAPSE_SHADOW_CSS);
      enhance(document);
      if (RPPM.get("comments.keyboard")) {
        window.addEventListener("keydown", onKeydown, true);
      }
      observer = RPPM.observeDeep(
        RPPM.debounce(() => {
          RPPM.shadow.scan(document);
          enhance(document);
        }, 350),
        { throttle: 450 }
      );
    },
    onSettings() {
      RPPM.shadow.set("rppm-comments", COLLAPSE_SHADOW_CSS);
      if (RPPM.get("comments.buttons")) {
        RPPM.$$("shreddit-comment, .commentarea .comment").forEach((el) => {
          delete el.dataset.rppmEnhanced;
        });
        enhance(document);
      } else {
        RPPM.$$(".rppm-collapse-btn").forEach((b) => b.remove());
        if (RPPM.shadow && RPPM.shadow.roots) {
          for (const root of RPPM.shadow.roots) {
            root.querySelectorAll(".rppm-collapse-btn").forEach((b) => b.remove());
          }
        }
        RPPM.$$("shreddit-comment, .commentarea .comment").forEach((el) => {
          delete el.dataset.rppmEnhanced;
        });
      }
      if (RPPM.get("comments.keyboard")) {
        window.addEventListener("keydown", onKeydown, true);
      } else {
        window.removeEventListener("keydown", onKeydown, true);
      }
    },
    destroy() {
      if (observer) observer.disconnect();
      window.removeEventListener("keydown", onKeydown, true);
    },
    collapseAll,
    expandAll,
    toggle
  });
})();
