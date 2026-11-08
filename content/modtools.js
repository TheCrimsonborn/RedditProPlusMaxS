/* Reddit Pro Plus Max - moderator toolbox (essentials) */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  let modSubs = null;
  let observer = null;
  let hoverCard = null;
  let hoverTimer = null;
  let currentHoverUser = null;

  async function getModSubs(force) {
    if (modSubs && !force) return modSubs;
    try {
      const json = await RPPM.apiGet("/subreddits/mine/moderator.json", {
        limit: 100,
        raw_json: 1
      });
      modSubs = new Set(
        ((json && json.data && json.data.children) || []).map((c) =>
          c.data.display_name.toLowerCase()
        )
      );
    } catch {
      modSubs = new Set();
    }
    return modSubs;
  }

  async function isCurrentSubMod() {
    const sub = RPPM.currentSubreddit();
    if (!sub) return false;
    try {
      const subs = await getModSubs();
      return subs.has(sub.toLowerCase());
    } catch {
      return false;
    }
  }

  async function modAction(action, fullname, options) {
    const opts = options || {};
    const sub = opts.sub || RPPM.currentSubreddit();
    switch (action) {
      case "approve":
        await RPPM.apiPost("/api/approve", { id: fullname });
        break;
      case "remove":
        await RPPM.apiPost("/api/remove", {
          id: fullname,
          spam: opts.spam ? "true" : "false",
          mod_note: opts.reason || ""
        });
        break;
      case "lock":
        await RPPM.apiPost("/api/lock", { id: fullname });
        break;
      case "unlock":
        await RPPM.apiPost("/api/unlock", { id: fullname });
        break;
      case "distinguish":
        await RPPM.apiPost("/api/distinguish", {
          id: fullname,
          how: "yes",
          sticky: opts.sticky ? "true" : "false"
        });
        break;
      case "ban":
        if (!sub) throw new Error("Subreddit tespit edilemedi");
        await RPPM.apiPost("/api/friend", {
          name: opts.user,
          type: "banned",
          r: sub,
          reason: opts.reason || "",
          note: opts.note || "",
          duration: opts.duration || ""
        });
        break;
      case "unban":
        if (!sub) throw new Error("Subreddit tespit edilemedi");
        await RPPM.apiPost("/api/unfriend", {
          name: opts.user,
          type: "banned",
          r: sub
        });
        break;
      case "mute":
        if (!sub) throw new Error("Subreddit tespit edilemedi");
        await RPPM.apiPost("/api/friend", {
          name: opts.user,
          type: "muted",
          r: sub,
          note: opts.note || ""
        });
        break;
      case "unmute":
        if (!sub) throw new Error("Subreddit tespit edilemedi");
        await RPPM.apiPost("/api/unfriend", {
          name: opts.user,
          type: "muted",
          r: sub
        });
        break;
      default:
        throw new Error("Bilinmeyen işlem: " + action);
    }
    return true;
  }

  /* ---------------- notes ---------------- */

  function noteKey(sub, user) {
    return "notes:" + String(sub || "").toLowerCase() + ":" + String(user || "").toLowerCase();
  }

  async function getNote(sub, user) {
    const key = noteKey(sub, user);
    const got = await browser.storage.local.get(key);
    return got[key] || "";
  }

  async function setNote(sub, user, value) {
    const key = noteKey(sub, user);
    if (!value) await browser.storage.local.remove(key);
    else await browser.storage.local.set({ [key]: value });
  }

  /* ---------------- quick action menu ---------------- */

  function closeMenu() {
    const menu = document.querySelector(".rppm-mod-menu");
    if (menu) menu.remove();
  }

  function openMenu(anchor, fullname, user, postSub) {
    const targetSub = postSub || RPPM.currentSubreddit();
    closeMenu();
    const menu = document.createElement("div");
    menu.className = "rppm-mod-menu";
    menu.innerHTML =
      '<div class="rppm-mod-menu-title">Mod işlemleri' + (targetSub ? ' (r/' + RPPM.escapeHtml(targetSub) + ')' : '') + '</div>' +
      '<button data-act="approve">Onayla</button>' +
      '<button data-act="remove">Kaldır</button>' +
      '<button data-act="spam">Spam</button>' +
      '<button data-act="lock">Kilitle</button>' +
      '<button data-act="unlock">Kilidi aç</button>' +
      '<button data-act="distinguish">Ayırt et</button>' +
      (user ? '<button data-act="ban">Banla</button>' : "") +
      (user ? '<button data-act="mute">Sustur</button>' : "") +
      '<button data-act="note">Not ekle</button>';

    const rect = anchor.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = Math.max(10, Math.min(window.innerHeight - 300, rect.bottom + 6)) + "px";
    menu.style.left = Math.max(10, Math.min(window.innerWidth - 200, rect.left)) + "px";

    const onKey = (event) => {
      if (event.key === "Escape") {
        closeMenu();
        window.removeEventListener("keydown", onKey, true);
      }
    };
    window.addEventListener("keydown", onKey, true);

    menu.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-act]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const act = button.dataset.act;
      closeMenu();

      try {
        if (act === "note") {
          const value = window.prompt("Kullanıcı notu:", (await getNote(targetSub, user)) || "");
          if (value !== null) {
            await setNote(targetSub, user, value.trim());
            RPPM.toast("Not kaydedildi", "success");
          }
          return;
        }

        if (act === "ban") {
          const reason = window.prompt("Ban nedeni:", "Kural ihlali");
          if (reason === null) return;
          const duration = window.prompt("Süre (gün, boş = kalıcı):", "");
          if (duration === null) return;
          await modAction("ban", fullname, { user, reason, duration, sub: targetSub });
          RPPM.toast("Kullanıcı banlandı", "success");
          return;
        }

        if (act === "mute") {
          await modAction("mute", fullname, { user, sub: targetSub });
          RPPM.toast("Kullanıcı susturuldu", "success");
          return;
        }

        if (act === "remove" || act === "spam") {
          let reason = "";
          if (RPPM.get("mod.confirmRemove")) {
            reason = window.prompt("Kaldırma nedeni (opsiyonel):", "");
            if (reason === null) return;
          }
          await modAction("remove", fullname, { reason, spam: act === "spam", sub: targetSub });
          RPPM.toast(act === "spam" ? "Spam olarak işaretlendi" : "Gönderi kaldırıldı", "success");
          return;
        }

        await modAction(act, fullname, { sub: targetSub });
        RPPM.toast("İşlem tamam: " + act, "success");
      } catch (err) {
        RPPM.toast("Mod işlemi başarısız: " + err.message, "error");
      }
    });

    document.documentElement.appendChild(menu);

    const outside = (event) => {
      if (!menu.contains(event.target)) {
        closeMenu();
        document.removeEventListener("click", outside, true);
      }
    };
    setTimeout(() => document.addEventListener("click", outside, true), 0);
  }

  /* ---------------- old Reddit inline buttons ---------------- */

  async function addOldQuickActions() {
    if (!RPPM.get("mod.quickActions")) return;
    let subs;
    try {
      subs = await getModSubs();
    } catch {
      return;
    }
    if (!subs || !subs.size) return;

    const things = RPPM.$$(".thing[data-fullname]");
    for (const thing of things) {
      if (thing.dataset.rppmMod === "1") continue;
      const sub = RPPM.subredditFromThing(thing);
      if (!sub || !subs.has(sub.toLowerCase())) continue;
      const fullname = thing.dataset.fullname;
      if (!fullname) continue;
      thing.dataset.rppmMod = "1";
      const user = RPPM.userFromThing(thing);
      const host = thing.querySelector(".flat-list.buttons") || thing.querySelector(".entry") || thing;
      const wrap = document.createElement(host.tagName === "UL" ? "li" : "span");
      wrap.className = "rppm-mod-inline";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rppm-mod-btn";
      button.textContent = "M";
      button.title = "Moderatör işlemleri (r/" + sub + ")";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMenu(button, fullname, user, sub);
      });
      wrap.appendChild(button);
      host.appendChild(wrap);
    }
  }

  /* ---------------- new Reddit inline buttons ---------------- */

  async function addNewQuickActions() {
    if (!RPPM.get("mod.quickActions")) return;
    let subs;
    try {
      subs = await getModSubs();
    } catch {
      return;
    }
    if (!subs || !subs.size) return;

    const posts = RPPM.$$("shreddit-post, shreddit-comment");
    for (const el of posts) {
      if (el.dataset.rppmMod === "1") continue;
      const sub = RPPM.subredditFromThing(el);
      if (!sub || !subs.has(sub.toLowerCase())) continue;
      const fullname = RPPM.fullnameFromThing(el);
      if (!fullname) continue;
      el.dataset.rppmMod = "1";
      const user = RPPM.userFromThing(el);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rppm-mod-btn rppm-mod-btn-new";
      button.textContent = "M";
      button.title = "Moderatör işlemleri (r/" + sub + ")";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMenu(button, fullname, user, sub);
      });
      el.appendChild(button);
    }
  }

  /* ---------------- user hover card (old Reddit) ---------------- */

  function closeHoverCard() {
    if (hoverCard) {
      hoverCard.remove();
      hoverCard = null;
    }
    currentHoverUser = null;
  }

  async function showHoverCard(link, user) {
    if (!RPPM.get("mod.hoverCard")) return;
    if (currentHoverUser === user && hoverCard) return;
    currentHoverUser = user;
    closeHoverCard();
    currentHoverUser = user;

    const card = document.createElement("div");
    card.className = "rppm-hover-card";
    card.innerHTML = '<div class="rppm-hover-loading">Yükleniyor…</div>';
    const rect = link.getBoundingClientRect();
    card.style.position = "fixed";
    card.style.top = Math.max(10, Math.min(window.innerHeight - 350, rect.bottom + 8)) + "px";
    card.style.left = Math.max(10, Math.min(window.innerWidth - 340, rect.left)) + "px";
    document.documentElement.appendChild(card);
    hoverCard = card;

    card.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
    card.addEventListener("mouseleave", () => {
      hoverTimer = setTimeout(closeHoverCard, 400);
    });

    const onCardKey = (event) => {
      if (event.key === "Escape") {
        closeHoverCard();
        window.removeEventListener("keydown", onCardKey, true);
      }
    };
    window.addEventListener("keydown", onCardKey, true);

    try {
      const [about, overview, note] = await Promise.all([
        RPPM.getUserAbout(user),
        RPPM.getUserOverview(user, 5).catch(() => []),
        getNote(RPPM.currentSubreddit(), user)
      ]);

      const created = about.created_utc ? RPPM.formatDate(about.created_utc) : "?";
      const ageDays = about.created_utc
        ? Math.floor((Date.now() / 1000 - about.created_utc) / 86400)
        : 0;
      const items = overview
        .slice(0, 5)
        .map((c) => {
          const d = c.data;
          const title = d.title || (d.body ? d.body.slice(0, 90) : "");
          return (
            '<div class="rppm-hover-item">' +
            '<span class="rppm-hover-sub">r/' +
            RPPM.escapeHtml(d.subreddit || "?") +
            "</span> " +
            RPPM.escapeHtml(title) +
            "</div>"
          );
        })
        .join("");

      card.innerHTML =
        '<div class="rppm-hover-head">' +
        '<strong>u/' +
        RPPM.escapeHtml(user) +
        "</strong>" +
        '<button class="rppm-hover-close" title="Kapat">×</button>' +
        "</div>" +
        '<div class="rppm-hover-stats">' +
        "<span>Hesap: " +
        RPPM.escapeHtml(created) +
        " (" +
        ageDays +
        " gün)</span>" +
        "<span>Link karma: " +
        RPPM.formatNumber(about.link_karma) +
        "</span>" +
        "<span>Yorum karma: " +
        RPPM.formatNumber(about.comment_karma) +
        "</span>" +
        (about.is_mod ? '<span class="rppm-badge">mod</span>' : "") +
        "</div>" +
        '<div class="rppm-hover-recent">' +
        (items || '<div class="rppm-hover-item">Son aktivite yok</div>') +
        "</div>" +
        '<div class="rppm-hover-note">' +
        '<textarea placeholder="Kullanıcı notu…">' +
        RPPM.escapeHtml(note) +
        "</textarea>" +
        '<button class="rppm-btn rppm-btn-sm" data-act="save-note">Notu kaydet</button>' +
        "</div>" +
        '<div class="rppm-hover-actions">' +
        '<button class="rppm-btn rppm-btn-sm" data-act="ban">Banla</button>' +
        '<button class="rppm-btn rppm-btn-sm" data-act="mute">Sustur</button>' +
        "</div>";

      card.querySelector(".rppm-hover-close").addEventListener("click", closeHoverCard);
      card.querySelector('[data-act="save-note"]').addEventListener("click", async () => {
        const value = card.querySelector("textarea").value.trim();
        await setNote(RPPM.currentSubreddit(), user, value);
        RPPM.toast("Not kaydedildi", "success");
      });
      card.querySelector('[data-act="ban"]').addEventListener("click", async () => {
        const reason = window.prompt("Ban nedeni:", "Kural ihlali");
        if (reason === null) return;
        try {
          await modAction("ban", null, { user, reason });
          RPPM.toast("Kullanıcı banlandı", "success");
        } catch (err) {
          RPPM.toast("Ban başarısız: " + err.message, "error");
        }
      });
      card.querySelector('[data-act="mute"]').addEventListener("click", async () => {
        try {
          await modAction("mute", null, { user });
          RPPM.toast("Kullanıcı susturuldu", "success");
        } catch (err) {
          RPPM.toast("Susturma başarısız: " + err.message, "error");
        }
      });
    } catch (err) {
      card.innerHTML =
        '<div class="rppm-hover-head"><strong>u/' +
        RPPM.escapeHtml(user) +
        '</strong><button class="rppm-hover-close">×</button></div>' +
        '<div class="rppm-hover-item">Kullanıcı bilgisi alınamadı.</div>';
      card.querySelector(".rppm-hover-close").addEventListener("click", closeHoverCard);
    }
  }

  function onHover(event) {
    if (!RPPM.get("mod.hoverCard")) return;
    const link = event.target.closest && event.target.closest('a.author, a[href^="/user/"]');
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const m = href.match(/\/user\/([^/?#]+)/);
    if (!m) return;
    clearTimeout(hoverTimer);
    link.addEventListener("mouseleave", () => clearTimeout(hoverTimer), { once: true });
    hoverTimer = setTimeout(() => showHoverCard(link, decodeURIComponent(m[1])), 350);
  }

  /* ---------------- panel renderer ---------------- */

  async function render(container) {
    const sub = RPPM.currentSubreddit();
    const postFullname = RPPM.currentPostFullname();
    let mod = false;
    try {
      mod = await isCurrentSubMod();
    } catch (err) {
      mod = false;
    }

    container.innerHTML =
      '<div class="rppm-section">' +
      '<div class="rppm-section-title">Moderatör araçları</div>' +
      '<div class="rppm-muted">' +
      (sub
        ? "r/" + RPPM.escapeHtml(sub) + (mod ? " · moderatörsünüz" : " · moderatör değilsiniz")
        : "Bir subreddit sayfasında değilsiniz") +
      "</div>" +
      "</div>" +
      '<div class="rppm-section">' +
      '<div class="rppm-section-title">Kullanıcı sorgula</div>' +
      '<div class="rppm-row">' +
      '<input id="rppm-mod-user" class="rppm-input" placeholder="kullanıcı adı (u/ olmadan)">' +
      '<button id="rppm-mod-lookup" class="rppm-btn">Sorgula</button>' +
      "</div>" +
      '<div id="rppm-mod-user-result"></div>' +
      "</div>" +
      '<div class="rppm-section">' +
      '<div class="rppm-section-title">Bu sayfadaki gönderi</div>' +
      '<div id="rppm-mod-page-actions" class="rppm-row rppm-wrap"></div>' +
      "</div>" +
      '<div class="rppm-section">' +
      '<div class="rppm-section-title">Mod kuyrukları</div>' +
      '<div class="rppm-row rppm-wrap">' +
      (sub
        ? '<a class="rppm-btn rppm-btn-sm" href="/r/' + RPPM.escapeHtml(sub) + '/about/modqueue" target="_blank" rel="noreferrer">Modqueue ↗</a>' +
          '<a class="rppm-btn rppm-btn-sm" href="/r/' + RPPM.escapeHtml(sub) + '/about/reports" target="_blank" rel="noreferrer">Raporlar ↗</a>' +
          '<a class="rppm-btn rppm-btn-sm" href="/r/' + RPPM.escapeHtml(sub) + '/about/spam" target="_blank" rel="noreferrer">Spam ↗</a>' +
          '<a class="rppm-btn rppm-btn-sm" href="/r/' + RPPM.escapeHtml(sub) + '/about/unmoderated" target="_blank" rel="noreferrer">Onaysız ↗</a>'
        : '<a class="rppm-btn rppm-btn-sm" href="/mod/queue" target="_blank" rel="noreferrer">Genel Modqueue ↗</a>') +
      "</div>" +
      "</div>";

    const result = container.querySelector("#rppm-mod-user-result");
    const input = container.querySelector("#rppm-mod-user");
    const lookup = async () => {
      const user = input.value.trim().replace(/^u\//i, "");
      if (!user) return;
      result.innerHTML = '<div class="rppm-muted">Yükleniyor…</div>';
      try {
        const [about, overview, note] = await Promise.all([
          RPPM.getUserAbout(user),
          RPPM.getUserOverview(user, 6).catch(() => []),
          getNote(sub, user)
        ]);
        const tags = RPPM.get("extras.userTags", {}) || {};
        const tag = tags[user] || tags[user.toLowerCase()] || "";
        const items = overview
          .map((c) => {
            const d = c.data;
            return (
              '<div class="rppm-list-item"><div class="rppm-list-main">' +
              '<div class="rppm-list-title">' +
              RPPM.escapeHtml(d.title || (d.body || "").slice(0, 100)) +
              "</div>" +
              '<div class="rppm-list-meta">r/' +
              RPPM.escapeHtml(d.subreddit || "?") +
              " · " +
              RPPM.formatRelative(d.created_utc) +
              "</div></div></div>"
            );
          })
          .join("");

        result.innerHTML =
          '<div class="rppm-user-card">' +
          '<div class="rppm-row rppm-between"><strong>u/' +
          RPPM.escapeHtml(user) +
          "</strong><span class=\"rppm-muted\">" +
          RPPM.formatDate(about.created_utc) +
          "</span></div>" +
          '<div class="rppm-row rppm-wrap rppm-gap">' +
          "<span>Link: " +
          RPPM.formatNumber(about.link_karma) +
          "</span><span>Yorum: " +
          RPPM.formatNumber(about.comment_karma) +
          "</span>" +
          (about.is_mod ? '<span class="rppm-badge">mod</span>' : "") +
          (about.is_gold ? '<span class="rppm-badge">premium</span>' : "") +
          "</div>" +
          '<textarea id="rppm-mod-note" class="rppm-textarea" placeholder="Kullanıcı notu…">' +
          RPPM.escapeHtml(note) +
          "</textarea>" +
          '<div class="rppm-row rppm-wrap">' +
          '<button class="rppm-btn rppm-btn-sm" id="rppm-save-note">Notu kaydet</button>' +
          '<button class="rppm-btn rppm-btn-sm" id="rppm-ban-user">Banla</button>' +
          '<button class="rppm-btn rppm-btn-sm" id="rppm-mute-user">Sustur</button>' +
          "</div>" +
          '<div class="rppm-row rppm-wrap" style="margin-top:8px">' +
          '<input id="rppm-mod-tag" class="rppm-input" placeholder="Etiket (örn. spammer)" value="' +
          RPPM.escapeHtml(tag) +
          '">' +
          '<button class="rppm-btn rppm-btn-sm" id="rppm-save-tag">Etiketi kaydet</button>' +
          "</div>" +
          '<div class="rppm-section-title" style="margin-top:12px">Son aktivite</div>' +
          (items || '<div class="rppm-muted">Aktivite yok</div>') +
          "</div>";

        result.querySelector("#rppm-save-note").addEventListener("click", async () => {
          await setNote(sub, user, result.querySelector("#rppm-mod-note").value.trim());
          RPPM.toast("Not kaydedildi", "success");
        });
        result.querySelector("#rppm-save-tag").addEventListener("click", async () => {
          const value = result.querySelector("#rppm-mod-tag").value.trim();
          const all = Object.assign({}, RPPM.get("extras.userTags", {}) || {});
          if (value) all[user] = value;
          else delete all[user];
          await RPPM.set("extras.userTags", all);
          RPPM.refreshAll();
          RPPM.toast(value ? "Etiket kaydedildi" : "Etiket kaldırıldı", "success");
        });
        result.querySelector("#rppm-ban-user").addEventListener("click", async () => {
          const reason = window.prompt("Ban nedeni:", "Kural ihlali");
          if (reason === null) return;
          try {
            await modAction("ban", null, { user, reason });
            RPPM.toast("Kullanıcı banlandı", "success");
          } catch (err) {
            RPPM.toast("Ban başarısız: " + err.message, "error");
          }
        });
        result.querySelector("#rppm-mute-user").addEventListener("click", async () => {
          try {
            await modAction("mute", null, { user });
            RPPM.toast("Kullanıcı susturuldu", "success");
          } catch (err) {
            RPPM.toast("Susturma başarısız: " + err.message, "error");
          }
        });
      } catch (err) {
        result.innerHTML = '<div class="rppm-error">Kullanıcı bulunamadı: ' + RPPM.escapeHtml(err.message) + "</div>";
      }
    };
    container.querySelector("#rppm-mod-lookup").addEventListener("click", lookup);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") lookup();
    });

    const pageActions = container.querySelector("#rppm-mod-page-actions");
    if (!postFullname) {
      pageActions.innerHTML = '<span class="rppm-muted">Gönderi algılanmadı.</span>';
    } else if (!mod) {
      pageActions.innerHTML = '<span class="rppm-muted">Bu subreddit\'te moderatör değilsiniz.</span>';
    } else {
      const actions = [
        ["approve", "Onayla"],
        ["remove", "Kaldır"],
        ["spam", "Spam"],
        ["lock", "Kilitle"],
        ["unlock", "Kilidi aç"],
        ["distinguish", "Ayırt et"]
      ];
      for (const [act, label] of actions) {
        const button = document.createElement("button");
        button.className = "rppm-btn rppm-btn-sm";
        button.textContent = label;
        button.addEventListener("click", async () => {
          try {
            if (act === "remove" || act === "spam") {
              let reason = "";
              if (RPPM.get("mod.confirmRemove")) {
                reason = window.prompt("Kaldırma nedeni (opsiyonel):", "");
                if (reason === null) return;
              }
              await modAction("remove", postFullname, { reason, spam: act === "spam" });
            } else {
              await modAction(act, postFullname);
            }
            RPPM.toast("İşlem tamam: " + label, "success");
          } catch (err) {
            RPPM.toast("İşlem başarısız: " + err.message, "error");
          }
        });
        pageActions.appendChild(button);
      }
    }
  }

  /* ---------------- module ---------------- */

  RPPM.registerModule("mod", {
    init() {
      getModSubs().then((subs) => {
        if (!subs || !subs.size) return;
        addOldQuickActions();
        addNewQuickActions();
        if (RPPM.get("mod.hoverCard")) {
          document.addEventListener("mouseover", onHover, true);
        }
        observer = RPPM.observeDeep(
          RPPM.debounce(() => {
            addOldQuickActions();
            addNewQuickActions();
          }, 500),
          { throttle: 600 }
        );
      }).catch(() => {});
    },
    onSettings() {
      closeMenu();
      closeHoverCard();
      if (!RPPM.get("mod.quickActions")) {
        RPPM.$$(".rppm-mod-btn, .rppm-mod-inline").forEach((b) => b.remove());
        RPPM.$$("shreddit-post, shreddit-comment, .thing").forEach((el) => {
          delete el.dataset.rppmMod;
        });
      } else {
        addOldQuickActions();
        addNewQuickActions();
      }
      if (RPPM.get("mod.hoverCard")) {
        document.addEventListener("mouseover", onHover, true);
      } else {
        document.removeEventListener("mouseover", onHover, true);
      }
    },
    destroy() {
      if (observer) observer.disconnect();
      document.removeEventListener("mouseover", onHover, true);
      closeMenu();
      closeHoverCard();
      RPPM.$$(".rppm-mod-btn, .rppm-mod-inline").forEach((b) => b.remove());
    },
    render,
    modAction,
    getNote,
    setNote
  });
})();
