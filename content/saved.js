/* Reddit Pro Plus Max - saved posts / comments manager */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  const ui = {
    user: null,
    items: [],
    after: null,
    fetchedAt: null,
    loaded: false,
    loading: false,
    selected: new Set(),
    query: "",
    type: "all",
    sub: "",
    sort: "saved"
  };

  let listEl = null;
  let statusEl = null;
  let containerEl = null;

  function cacheKey(user) {
    return "saved:" + user;
  }
  function metaKey(user) {
    return "savedMeta:" + user;
  }

  async function loadCache(user) {
    const got = await browser.storage.local.get([cacheKey(user), metaKey(user)]);
    ui.items = got[cacheKey(user)] || [];
    const meta = got[metaKey(user)] || {};
    ui.after = meta.after || null;
    ui.fetchedAt = meta.fetchedAt || null;
    ui.loaded = true;
  }

  async function persist() {
    if (!ui.user) return;
    const limit = RPPM.get("saved.cacheLimit", 5000);
    if (ui.items.length > limit) ui.items = ui.items.slice(0, limit);
    await browser.storage.local.set({
      [cacheKey(ui.user)]: ui.items,
      [metaKey(ui.user)]: { after: ui.after, fetchedAt: ui.fetchedAt }
    });
  }

  function mapItem(child) {
    const d = child.data || {};
    const base = {
      id: d.name,
      type: child.kind === "t1" ? "comment" : "post",
      subreddit: d.subreddit || "",
      author: d.author || "",
      score: d.score || 0,
      created: d.created_utc || 0,
      permalink: d.permalink ? "https://www.reddit.com" + d.permalink : "",
      over18: !!d.over_18,
      flair: d.link_flair_text || "",
      savedAt: Date.now()
    };
    if (child.kind === "t1") {
      base.title = d.link_title || (d.body || "").replace(/\s+/g, " ").slice(0, 140);
      base.body = d.body || "";
      base.comments = 0;
      base.url = "";
      base.thumbnail = "";
    } else {
      base.title = d.title || "(başlıksız)";
      base.body = d.selftext || "";
      base.comments = d.num_comments || 0;
      base.url = d.url || "";
      base.thumbnail =
        d.thumbnail && /^https?:/i.test(d.thumbnail) ? d.thumbnail : "";
    }
    return base;
  }

  function mergeItems(incoming) {
    const byId = new Map(ui.items.map((item) => [item.id, item]));
    for (const item of incoming) {
      const old = byId.get(item.id);
      if (old) {
        item.savedAt = old.savedAt;
        item.body = item.body || old.body;
      }
      byId.set(item.id, item);
    }
    ui.items = Array.from(byId.values());
  }

  async function fetchPage(user, after) {
    const params = {
      limit: RPPM.get("saved.pageSize", 100),
      raw_json: 1,
      sr_detail: 1
    };
    if (after) params.after = after;
    const path = "/user/" + encodeURIComponent(user) + "/saved.json";

    try {
      return await RPPM.apiGet(path, params);
    } catch (err) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) qs.set(k, v);
      return await RPPM.bgFetch(
        "https://old.reddit.com" + path + "?" + qs.toString()
      );
    }
  }

  async function syncPages(pages) {
    if (ui.loading) return;
    ui.loading = true;
    setStatus("Senkronize ediliyor…");

    try {
      const me = await RPPM.getMe();
      if (ui.user && ui.user !== me.name) {
        ui.loaded = false;
        ui.items = [];
        ui.after = null;
        ui.selected.clear();
      }
      ui.user = me.name;
      if (!ui.loaded) await loadCache(ui.user);

      let fetched = 0;
      const max = Math.max(1, pages || 1);
      for (let i = 0; i < max; i++) {
        const json = await fetchPage(ui.user, ui.after);
        const children = (json.data && json.data.children) || [];
        if (!children.length) {
          ui.after = null;
          break;
        }
        mergeItems(children.map(mapItem));
        ui.after = json.data.after || null;
        fetched += children.length;
        setStatus("Senkronize ediliyor… " + fetched + " öğe");
        if (!ui.after) break;
        await RPPM.sleep(350);
      }
      ui.fetchedAt = Date.now();
      await persist();
      setStatus(
        fetched
          ? fetched + " yeni öğe alındı · toplam " + ui.items.length
          : "Yeni öğe yok · toplam " + ui.items.length
      );
      renderList();
    } catch (err) {
      setStatus("Hata: " + err.message, true);
    } finally {
      ui.loading = false;
    }
  }

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle("rppm-error", !!isError);
  }

  function filteredItems() {
    const query = ui.query.trim().toLowerCase();
    let items = ui.items.slice();

    if (ui.type !== "all") items = items.filter((item) => item.type === ui.type);
    if (ui.sub.trim()) {
      const sub = ui.sub.trim().toLowerCase().replace(/^r\//, "");
      items = items.filter((item) => item.subreddit.toLowerCase().includes(sub));
    }
    if (query) {
      items = items.filter((item) => {
        const hay = [item.title, item.body, item.subreddit, item.author, item.flair]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });
    }

    switch (ui.sort) {
      case "created":
        items.sort((a, b) => b.created - a.created);
        break;
      case "score":
        items.sort((a, b) => b.score - a.score);
        break;
      case "title":
        items.sort((a, b) => a.title.localeCompare(b.title, "tr"));
        break;
      default:
        items.sort((a, b) => b.savedAt - a.savedAt);
    }
    return items;
  }

  function renderList() {
    if (!listEl) return;
    const items = filteredItems();
    const shown = items.slice(0, 400);
    for (const id of Array.from(ui.selected)) {
      if (!ui.items.some((item) => item.id === id)) ui.selected.delete(id);
    }

    if (!items.length) {
      listEl.innerHTML =
        '<div class="rppm-empty">' +
        (ui.items.length
          ? "Filtreye uyan öğe yok."
          : "Henüz kaydedilmiş öğe yok. “Senkronize et”e basın.") +
        "</div>";
      updateSelectionLabel();
      return;
    }

    listEl.innerHTML = shown
      .map((item) => {
        const checked = ui.selected.has(item.id) ? " checked" : "";
        const thumb = item.thumbnail
          ? '<img class="rppm-thumb" loading="lazy" src="' +
            RPPM.escapeHtml(item.thumbnail) +
            '" alt="">'
          : "";
        return (
          '<div class="rppm-list-item" data-id="' +
          RPPM.escapeHtml(item.id) +
          '">' +
          '<input type="checkbox" class="rppm-check" data-id="' +
          RPPM.escapeHtml(item.id) +
          '"' +
          checked +
          ">" +
          thumb +
          '<div class="rppm-list-main">' +
          '<div class="rppm-list-title"><a href="' +
          RPPM.escapeHtml(item.permalink) +
          '" target="_blank" rel="noreferrer">' +
          RPPM.escapeHtml(item.title) +
          "</a></div>" +
          '<div class="rppm-list-meta">' +
          '<span class="rppm-pill">' +
          (item.type === "comment" ? "yorum" : "gönderi") +
          "</span> r/" +
          RPPM.escapeHtml(item.subreddit) +
          " · u/" +
          RPPM.escapeHtml(item.author) +
          " · " +
          RPPM.formatNumber(item.score) +
          " puan" +
          (item.comments ? " · " + RPPM.formatNumber(item.comments) + " yorum" : "") +
          " · " +
          RPPM.formatRelative(item.created) +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    if (items.length > shown.length) {
      listEl.insertAdjacentHTML(
        "beforeend",
        '<div class="rppm-muted">+' + (items.length - shown.length) + " öğe daha (filtreyi daraltın)</div>"
      );
    }
    updateSelectionLabel();
  }

  function updateSelectionLabel() {
    if (!containerEl) return;
    const label = containerEl.querySelector("#rppm-saved-selection");
    if (label) label.textContent = ui.selected.size + " seçili";
  }

  async function unsaveSelected() {
    if (!ui.selected.size) {
      setStatus("Önce öğe seçin.", true);
      return;
    }
    const count = ui.selected.size;
    if (!window.confirm(count + " öğe kaydedilenlerden kaldırılsın mı?")) return;

    const ids = Array.from(ui.selected);
    let done = 0;
    for (const id of ids) {
      try {
        await RPPM.apiPost("/api/unsave", { id });
        ui.items = ui.items.filter((item) => item.id !== id);
        ui.selected.delete(id);
        done++;
        setStatus("Kaldırılıyor… " + done + "/" + ids.length);
        await RPPM.sleep(700);
      } catch (err) {
        setStatus("Kaldırma hatası: " + err.message, true);
        break;
      }
    }
    await persist();
    renderList();
    setStatus(done + " öğe kaldırıldı", false);
  }

  function exportItems(format) {
    const items = filteredItems();
    if (!items.length) {
      setStatus("Dışa aktarılacak öğe yok.", true);
      return;
    }
    let content;
    let mime;
    let ext;
    if (format === "csv") {
      const rows = [
        ["id", "type", "title", "subreddit", "author", "score", "comments", "created", "url", "permalink"]
      ];
      for (const item of items) {
        rows.push([
          item.id,
          item.type,
          item.title,
          item.subreddit,
          item.author,
          item.score,
          item.comments,
          new Date(item.created * 1000).toISOString(),
          item.url,
          item.permalink
        ]);
      }
      content = rows
        .map((row) =>
          row
            .map((cell) => '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"')
            .join(",")
        )
        .join("\r\n");
      mime = "text/csv;charset=utf-8";
      ext = "csv";
    } else {
      content = JSON.stringify(items, null, 2);
      mime = "application/json";
      ext = "json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reddit-saved-" + (ui.user || "export") + "-" + Date.now() + "." + ext;
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStatus(items.length + " öğe dışa aktarıldı", false);
  }

  async function render(container) {
    containerEl = container;
    container.innerHTML =
      '<div class="rppm-section">' +
      '<div class="rppm-row rppm-between">' +
      '<div class="rppm-section-title">Kaydedilenler</div>' +
      '<div class="rppm-row">' +
      '<button id="rppm-saved-sync" class="rppm-btn rppm-btn-sm">Senkronize et</button>' +
      '<button id="rppm-saved-more" class="rppm-btn rppm-btn-sm">Daha fazla</button>' +
      "</div></div>" +
      '<div class="rppm-row rppm-wrap">' +
      '<input id="rppm-saved-search" class="rppm-input" placeholder="Ara: başlık, subreddit, kullanıcı…">' +
      '<input id="rppm-saved-sub" class="rppm-input rppm-input-sm" placeholder="r/subreddit">' +
      '<select id="rppm-saved-type" class="rppm-select">' +
      '<option value="all">Tümü</option>' +
      '<option value="post">Gönderiler</option>' +
      '<option value="comment">Yorumlar</option>' +
      "</select>" +
      '<select id="rppm-saved-sort" class="rppm-select">' +
      '<option value="saved">Kaydetme tarihi</option>' +
      '<option value="created">Oluşturma tarihi</option>' +
      '<option value="score">Puan</option>' +
      '<option value="title">Başlık</option>' +
      "</select>" +
      "</div>" +
      '<div id="rppm-saved-status" class="rppm-muted"></div>' +
      '<div class="rppm-row rppm-between rppm-wrap">' +
      '<span id="rppm-saved-selection" class="rppm-muted">0 seçili</span>' +
      '<div class="rppm-row rppm-wrap">' +
      '<button id="rppm-saved-selectall" class="rppm-btn rppm-btn-sm">Görünenleri seç</button>' +
      '<button id="rppm-saved-unsave" class="rppm-btn rppm-btn-sm rppm-btn-danger">Seçilenleri kaldır</button>' +
      '<button id="rppm-saved-json" class="rppm-btn rppm-btn-sm">JSON</button>' +
      '<button id="rppm-saved-csv" class="rppm-btn rppm-btn-sm">CSV</button>' +
      "</div></div>" +
      "</div>" +
      '<div id="rppm-saved-list" class="rppm-list"></div>';

    listEl = container.querySelector("#rppm-saved-list");
    statusEl = container.querySelector("#rppm-saved-status");

    const search = container.querySelector("#rppm-saved-search");
    const sub = container.querySelector("#rppm-saved-sub");
    const type = container.querySelector("#rppm-saved-type");
    const sort = container.querySelector("#rppm-saved-sort");

    search.addEventListener(
      "input",
      RPPM.debounce(() => {
        ui.query = search.value;
        renderList();
      }, 180)
    );
    sub.addEventListener(
      "input",
      RPPM.debounce(() => {
        ui.sub = sub.value;
        renderList();
      }, 180)
    );
    type.addEventListener("change", () => {
      ui.type = type.value;
      renderList();
    });
    sort.addEventListener("change", () => {
      ui.sort = sort.value;
      renderList();
    });

    container.querySelector("#rppm-saved-sync").addEventListener("click", () => syncPages(10));
    container.querySelector("#rppm-saved-more").addEventListener("click", () => syncPages(1));
    container.querySelector("#rppm-saved-json").addEventListener("click", () => exportItems("json"));
    container.querySelector("#rppm-saved-csv").addEventListener("click", () => exportItems("csv"));
    container.querySelector("#rppm-saved-unsave").addEventListener("click", unsaveSelected);
    container.querySelector("#rppm-saved-selectall").addEventListener("click", () => {
      const items = filteredItems().slice(0, 400);
      const allSelected = items.every((item) => ui.selected.has(item.id));
      if (allSelected) items.forEach((item) => ui.selected.delete(item.id));
      else items.forEach((item) => ui.selected.add(item.id));
      renderList();
    });

    listEl.addEventListener("change", (event) => {
      const box = event.target.closest('input[type="checkbox"][data-id]');
      if (!box) return;
      if (box.checked) ui.selected.add(box.dataset.id);
      else ui.selected.delete(box.dataset.id);
      updateSelectionLabel();
    });

    try {
      const me = await RPPM.getMe();
      if (ui.user && ui.user !== me.name) {
        ui.loaded = false;
        ui.items = [];
        ui.after = null;
        ui.selected.clear();
      }
      ui.user = me.name;
      if (!ui.loaded) await loadCache(ui.user);
      setStatus(
        ui.items.length
          ? ui.items.length + " kayıtlı öğe" + (ui.fetchedAt ? " · son: " + new Date(ui.fetchedAt).toLocaleString("tr-TR") : "")
          : "Henüz önbellek yok"
      );
      renderList();
      if (!ui.items.length && !ui.loading) {
        syncPages(2);
      }
    } catch (err) {
      setStatus("Giriş yapılmamış olabilir: " + err.message, true);
    }
  }

  RPPM.saved = {
    render,
    syncPages,
    unsaveSelected,
    exportItems,
    get items() {
      return ui.items;
    },
    async clearCache() {
      if (!ui.user) return;
      await browser.storage.local.remove([cacheKey(ui.user), metaKey(ui.user)]);
      ui.items = [];
      ui.after = null;
      ui.loaded = false;
      renderList();
    }
  };

  RPPM.registerModule("saved", {
    init() {
      // The manager is UI-driven; nothing to do until the panel opens.
    }
  });
})();
