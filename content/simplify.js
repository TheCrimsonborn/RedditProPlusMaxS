/* Reddit Pro Plus Max - new/old Reddit simplification */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  function shadowCss() {
    const s = RPPM.settings.simplify || {};
    const rules = [":host([rppm-hidden]) { display: none !important; }"];

    if (s.hideAwards) {
      rules.push(
        '[data-testid*="award" i], [aria-label*="award" i], award-button, [data-testid*="awarding" i] { display: none !important; }'
      );
    }
    if (s.hideAvatars) {
      rules.push(
        '[data-testid*="avatar" i], img[alt*="avatar" i], [data-testid*="profile-icon" i] { display: none !important; }'
      );
    }
    if (s.hideKarma) {
      rules.push(
        '[data-testid*="karma" i], [data-testid="post-vote"] .score, [part="score"] { visibility: hidden !important; }'
      );
    }
    if (s.hideVoteButtons) {
      rules.push(
        '[data-testid*="vote" i], [data-testid="vote-button"], [part="vote"] { display: none !important; }'
      );
    }
    if (s.hideCommentCount) {
      rules.push('[data-testid*="comment-count" i], [part="comment-count"] { display: none !important; }');
    }
    if (s.hidePostFlair) {
      rules.push('[slot="post-flair"], [data-testid*="flair" i], [part="flair"] { display: none !important; }');
    }
    if (s.hideUsername) {
      rules.push('[slot="author"], [data-testid*="author" i], [part="author"] { display: none !important; }');
    }
    if (RPPM.get("ads.hidePromoted")) {
      rules.push(
        '[data-testid*="promoted" i], [aria-label*="promoted" i], [data-ad-id], [data-testid*="ad-" i] { display: none !important; }'
      );
    }
    if (s.compact) {
      rules.push(
        'article, [part="post-container"], [part="comment"] { padding: 2px 4px !important; margin: 0 !important; }'
      );
    }
    return rules.join("\n");
  }

  let observer = null;
  let videoObserver = null;

  function killAutoplay(root) {
    if (!RPPM.get("simplify.disableAutoplay")) return;
    const scope = root && root.querySelectorAll ? root : document;
    const videos = scope.querySelectorAll("video");
    for (const video of videos) {
      if (video.dataset.rppmUserPlay === "1") continue;
      video.autoplay = false;
      video.removeAttribute("autoplay");
      video.setAttribute("preload", "none");
      if (!video.paused) {
        try {
          video.pause();
        } catch (err) {
          /* ignore */
        }
      }
    }
  }

  function markUserPlay(event) {
    const video = event.target;
    if (video && video.tagName === "VIDEO") video.dataset.rppmUserPlay = "1";
  }

  function apply() {
    RPPM.shadow.set("rppm-simplify", shadowCss());
    RPPM.shadow.scan(document);

    if (RPPM.get("simplify.disableAutoplay")) {
      killAutoplay(document);
      if (!videoObserver) {
        videoObserver = new MutationObserver(RPPM.debounce(() => killAutoplay(document), 300));
        videoObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
      document.addEventListener("click", markUserPlay, true);
    } else if (videoObserver) {
      videoObserver.disconnect();
      videoObserver = null;
    }
  }

  RPPM.registerModule("simplify", {
    init() {
      apply();
      observer = RPPM.observeDeep(
        RPPM.debounce(() => {
          RPPM.shadow.scan(document);
          killAutoplay(document);
        }, 400),
        { throttle: 500 }
      );
    },
    onSettings() {
      apply();
    },
    destroy() {
      if (observer) observer.disconnect();
      if (videoObserver) videoObserver.disconnect();
    }
  });
})();
