(async function () {
  "use strict";

  if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
    globalThis.browser = globalThis.chrome;
  }

  await RPPM.load();

  const statusEl = document.getElementById("page-status");
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];
  const isReddit = !!(tab && /^https?:\/\/([a-z0-9-]+\.)?reddit\.com\//i.test(tab.url || ""));

  if (isReddit) {
    try {
      const url = new URL(tab.url);
      const subMatch = url.pathname.match(/^\/r\/([^/]+)/i);
      const displayPath = subMatch ? "r/" + subMatch[1] : (url.pathname === "/" ? "Anasayfa" : url.hostname);
      statusEl.textContent = "Reddit sekmesi: " + displayPath;
      statusEl.classList.add("ok");
    } catch (err) {
      statusEl.textContent = "Reddit sekmesi algılandı";
      statusEl.classList.add("ok");
    }
  } else {
    statusEl.textContent = "Reddit sekmesinde değilsiniz. Panel düğmeleri için Reddit'i açın.";
    statusEl.classList.add("bad");
  }

  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = !!RPPM.get(input.dataset.setting);
    input.addEventListener("change", async () => {
      await RPPM.set(input.dataset.setting, input.checked);
    });
  });

  const got = await browser.storage.local.get("stats");
  const stats = got.stats || {};
  const setStat = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = RPPM.formatNumber ? RPPM.formatNumber(value || 0) : String(value || 0);
  };
  setStat("stat-ads", stats.adsBlocked);
  setStat("stat-comments", stats.commentsCollapsed);
  setStat("stat-filtered", stats.postsFiltered);
  setStat("stat-deleted", stats.deleted);

  document.querySelectorAll("[data-panel]").forEach((button) => {
    if (!isReddit) button.disabled = true;
    button.addEventListener("click", async () => {
      if (!isReddit || !tab) return;
      try {
        await browser.tabs.sendMessage(tab.id, {
          type: "rppm:openPanel",
          panel: button.dataset.panel
        });
        window.close();
      } catch (err) {
        statusEl.textContent = "İçerik betiği hazır değil. Reddit sayfasını yenileyip tekrar deneyin.";
        statusEl.classList.add("bad");
      }
    });
  });

  document.getElementById("options").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  document.getElementById("open-reddit").addEventListener("click", () => {
    browser.tabs.create({ url: "https://www.reddit.com/" });
  });

  if (isReddit && tab) {
    try {
      const info = await browser.tabs.sendMessage(tab.id, { type: "rppm:getInfo" });
      if (info && info.ok) {
        const parts = [];
        if (info.subreddit) parts.push("r/" + info.subreddit);
        if (info.user) parts.push("u/" + info.user);
        if (parts.length) statusEl.textContent = parts.join(" · ");
      }
    } catch (err) {
      /* content script not injected yet */
    }
  }
})();
