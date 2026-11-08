/* Headless smoke test for the content scripts using jsdom.
 * Run with: node tools/smoke-test.js
 * This is a development helper; it is excluded from the extension package.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const errors = [];

const html = `<!DOCTYPE html>
<html>
  <body>
    <div id="siteTable">
      <div class="thing promoted" data-fullname="t3_ad1"><a class="title">Ad</a></div>
      <div class="thing" data-fullname="t3_p1" data-subreddit="askreddit" data-author="alice">
        <a class="title">Normal post</a>
      </div>
    </div>
    <div class="commentarea">
      <div class="comment" data-fullname="t1_c1">
        <div class="entry">
          <p class="tagline"><a class="author" href="/user/alice">alice</a></p>
          <div class="usertext-body">hello</div>
          <div class="child"></div>
        </div>
      </div>
    </div>
    <shreddit-post id="t3_abc" subreddit="AskReddit" author="bob" post-title="Hello" permalink="/r/AskReddit/comments/abc/hello/" promoted></shreddit-post>
    <shreddit-post id="t3_def" subreddit="news" author="carol" post-title="World" permalink="/r/news/comments/def/world/"></shreddit-post>
    <shreddit-comment thingid="t1_c2" depth="0"><div slot="comment">comment</div></shreddit-comment>
  </body>
</html>`;

const dom = new JSDOM(html, {
  url: "https://www.reddit.com/r/test/",
  runScripts: "outside-only",
  pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

window.addEventListener("error", (event) => {
  errors.push("window error: " + (event.error ? event.error.stack : event.message));
});
process.on("unhandledRejection", (reason) => {
  errors.push("unhandled rejection: " + (reason && reason.stack ? reason.stack : reason));
});

window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};
window.confirm = () => true;
window.prompt = () => null;

const store = {};
function storageGet(keys) {
  if (keys == null) return Promise.resolve(Object.assign({}, store));
  if (typeof keys === "string") return Promise.resolve({ [keys]: store[keys] });
  if (Array.isArray(keys)) {
    const out = {};
    for (const key of keys) out[key] = store[key];
    return Promise.resolve(out);
  }
  const out = {};
  for (const key of Object.keys(keys)) out[key] = store[key] === undefined ? keys[key] : store[key];
  return Promise.resolve(out);
}
function storageSet(values) {
  Object.assign(store, values);
  return Promise.resolve();
}
function storageRemove(keys) {
  for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
  return Promise.resolve();
}

window.browser = {
  storage: {
    local: { get: storageGet, set: storageSet, remove: storageRemove },
    onChanged: { addListener() {} }
  },
  runtime: {
    onMessage: { addListener() {} },
    sendMessage: async () => ({ ok: false, status: 0, text: "{}" }),
    getURL: (p) => p,
    openOptionsPage() {}
  }
};

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(body),
  json: async () => body
});

window.fetch = async (url) => {
  const u = String(url);
  if (u.includes("/api/me.json")) {
    return jsonResponse({ data: { name: "tester", modhash: "mh" } });
  }
  if (u.includes("/user/tester/saved.json")) {
    return jsonResponse({
      kind: "Listing",
      data: {
        after: null,
        children: [
          {
            kind: "t3",
            data: {
              name: "t3_s1",
              title: "Saved post",
              subreddit: "test",
              author: "alice",
              score: 10,
              num_comments: 2,
              created_utc: 1700000000,
              permalink: "/r/test/comments/s1/saved/",
              url: "https://example.com",
              thumbnail: "self",
              over_18: false
            }
          }
        ]
      }
    });
  }
  if (u.includes("/user/tester/overview.json")) {
    return jsonResponse({
      kind: "Listing",
      data: {
        after: null,
        children: [
          {
            kind: "t3",
            data: {
              name: "t3_o1",
              title: "Old post",
              subreddit: "test",
              author: "tester",
              score: 1,
              created_utc: 1600000000,
              permalink: "/r/test/comments/o1/old/"
            }
          }
        ]
      }
    });
  }
  if (u.includes("/subreddits/mine/moderator.json")) {
    return jsonResponse({ data: { children: [{ data: { display_name: "test" } }] } });
  }
  if (u.includes("/user/alice/about.json")) {
    return jsonResponse({
      data: { name: "alice", created_utc: 1500000000, link_karma: 100, comment_karma: 200, is_mod: false }
    });
  }
  return jsonResponse({ data: { children: [] } });
};

function load(file) {
  const code = fs.readFileSync(path.join(root, file), "utf8");
  window.eval(code);
}

const files = [
  "lib/settings.js",
  "lib/util.js",
  "content/core.js",
  "content/simplify.js",
  "content/ads.js",
  "content/comments.js",
  "content/extras.js",
  "content/modtools.js",
  "content/saved.js",
  "content/cleanup.js",
  "content/panel.js"
];

for (const file of files) load(file);

document.dispatchEvent(new window.Event("DOMContentLoaded"));

function assert(condition, message) {
  if (condition) {
    console.log("PASS  " + message);
  } else {
    console.error("FAIL  " + message);
    process.exitCode = 1;
  }
}

(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const RPPM = window.RPPM;
  assert(!!RPPM, "RPPM namespace exists");
  assert(!!RPPM.settings, "settings loaded");
  assert(document.documentElement.classList.contains("rppm-on"), "master class applied");
  assert(
    document.querySelector(".thing.promoted").getAttribute("data-rppm-ad") === "1",
    "old Reddit promoted post blocked"
  );
  assert(
    document.querySelector('shreddit-post[promoted]').getAttribute("data-rppm-ad") === "1",
    "new Reddit promoted post blocked"
  );
  assert(!!document.querySelector(".comment .rppm-collapse-btn"), "old Reddit collapse button added");
  assert(!!document.querySelector("shreddit-comment .rppm-collapse-btn"), "new Reddit collapse button added");
  assert(!!document.querySelector(".rppm-float-btn"), "old/new Reddit floating button added");

  const oldComment = document.querySelector(".comment");
  oldComment.querySelector(".rppm-collapse-btn").click();
  assert(oldComment.classList.contains("collapsed"), "old Reddit comment collapses");

  const newComment = document.querySelector("shreddit-comment");
  newComment.querySelector(".rppm-collapse-btn").click();
  assert(newComment.classList.contains("rppm-collapsed"), "new Reddit comment collapses");

  RPPM.settings.extras.keywordBlocklist = ["normal"];
  RPPM.refreshAll();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(
    document.querySelector('.thing[data-subreddit="askreddit"]').classList.contains("rppm-filtered"),
    "keyword filter hides matching post"
  );

  RPPM.panel.open("settings");
  await new Promise((resolve) => setTimeout(resolve, 150));
  const host = document.getElementById("rppm-panel-host");
  assert(!!host, "panel host created");
  assert(!!host.shadowRoot, "panel uses shadow DOM");
  assert(!!host.shadowRoot.querySelector(".section"), "settings panel rendered");

  const savedBox = document.createElement("div");
  document.body.appendChild(savedBox);
  await RPPM.saved.render(savedBox);
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert(!!savedBox.querySelector("#rppm-saved-list"), "saved panel rendered");
  assert(savedBox.querySelectorAll(".rppm-list-item").length >= 1, "saved item rendered");

  const cleanBox = document.createElement("div");
  document.body.appendChild(cleanBox);
  await RPPM.cleanup.render(cleanBox);
  assert(!!cleanBox.querySelector("#rppm-clean-preview"), "cleanup panel rendered");
  assert(!!cleanBox.querySelector("#rppm-clean-list"), "cleanup list rendered");
  cleanBox.querySelector("#rppm-clean-preview").click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert(cleanBox.querySelectorAll(".rppm-list-item").length >= 1, "cleanup preview lists items");

  const modBox = document.createElement("div");
  document.body.appendChild(modBox);
  const mod = RPPM.moduleByName("mod");
  assert(!!mod && typeof mod.render === "function", "mod module registered");
  await mod.render(modBox);
  assert(!!modBox.querySelector("#rppm-mod-user"), "mod panel rendered");
  modBox.querySelector("#rppm-mod-user").value = "alice";
  modBox.querySelector("#rppm-mod-lookup").click();
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(!!modBox.querySelector(".rppm-user-card"), "mod user lookup renders card");
  modBox.querySelector("#rppm-mod-tag").value = "spammer";
  modBox.querySelector("#rppm-save-tag").click();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert(
    (RPPM.get("extras.userTags", {}) || {}).alice === "spammer",
    "mod user tag saved"
  );

  assert(errors.length === 0, "no uncaught errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  console.log("\nSmoke test finished.");
})().catch((err) => {
  console.error("SMOKE TEST CRASH", err);
  process.exitCode = 1;
});
