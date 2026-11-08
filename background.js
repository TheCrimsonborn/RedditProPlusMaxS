/* Reddit Pro Plus Max S - background service worker & event page
 * Compatible with Firefox (MV3 scripts / event page) and Chromium (Chrome, Edge, Opera MV3 service worker).
 */
"use strict";

if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
  globalThis.browser = globalThis.chrome;
}

const REDDIT_URL = /^https?:\/\/([a-z0-9-]+\.)?reddit\.com\//i;
const menuAPI = browser.contextMenus || browser.menus;

browser.runtime.onInstalled.addListener(async (details) => {
  try {
    const got = await browser.storage.local.get("settings");
    if (!got.settings) {
      await browser.storage.local.set({ settings: {} });
    }
  } catch (err) {
    console.warn("[RPPM] install init failed", err);
  }

  if (menuAPI) {
    try {
      await menuAPI.removeAll();
      menuAPI.create({
        id: "rppm-open-panel",
        title: "Reddit Pro Plus Max S panelini aç",
        contexts: ["page", "selection", "link"],
        documentUrlPatterns: ["*://*.reddit.com/*"]
      });
      menuAPI.create({
        id: "rppm-open-saved",
        title: "Kaydedilenleri yönet",
        contexts: ["page"],
        documentUrlPatterns: ["*://*.reddit.com/*"]
      });
      menuAPI.create({
        id: "rppm-open-cleanup",
        title: "Geçmişi temizle",
        contexts: ["page"],
        documentUrlPatterns: ["*://*.reddit.com/*"]
      });
    } catch (err) {
      console.warn("[RPPM] menus failed", err);
    }
  }

  if (details.reason === "install") {
    try {
      await browser.tabs.create({ url: browser.runtime.getURL("options/options.html?welcome=1") });
    } catch (err) {
      /* ignore */
    }
  }
});

if (menuAPI && menuAPI.onClicked) {
  menuAPI.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;
    const panel =
      info.menuItemId === "rppm-open-saved"
        ? "saved"
        : info.menuItemId === "rppm-open-cleanup"
          ? "cleanup"
          : "settings";
    try {
      await browser.tabs.sendMessage(tab.id, { type: "rppm:openPanel", panel });
    } catch (err) {
      /* content script not ready */
    }
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return false;

  if (message.type === "rppm:openOptions") {
    browser.runtime.openOptionsPage();
    if (typeof sendResponse === "function") sendResponse({ ok: true });
    return true;
  }

  if (message.type !== "rppm:fetch") return false;

  const url = message.url;
  if (typeof url !== "string" || !REDDIT_URL.test(url)) {
    if (typeof sendResponse === "function") {
      sendResponse({ ok: false, status: 0, text: "Geçersiz URL" });
    }
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal: controller.signal
  })
    .then(async (res) => {
      const text = await res.text();
      if (typeof sendResponse === "function") {
        sendResponse({ ok: res.ok, status: res.status, text });
      }
    })
    .catch((err) => {
      if (typeof sendResponse === "function") {
        sendResponse({ ok: false, status: 0, text: String(err) });
      }
    })
    .finally(() => {
      clearTimeout(timer);
    });

  return true; // Keep message channel open for sendResponse
});
