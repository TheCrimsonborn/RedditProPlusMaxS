/* Reddit Pro Plus Max - account cleanup (bulk delete posts/comments) */
(function () {
  "use strict";

  const RPPM = window.RPPM;

  const ui = {
    user: null,
    items: [],
    selected: new Set(),
    loading: false,
    running: false,
    stop: false,
    fetchedAt: null,
    log: []
  };

  let listEl = null;
  let statusEl = null;
  let progressEl = null;
  let logEl = null;
  let containerEl = null;

  function mapItem(child) {
    const d = child.data || {};
    if (!d.name) return null;
    const isComment = child.kind === "t1";
    return {
      id: d.name,
      type: isComment ? "comment" : "post",
      title: isComment
        ? (d.body || "").replace(/\s+/g, " ").slice(0, 160)
        : d.title || "(başlıksız)",
      subreddit: d.subreddit || "",
      author: d.author || "",
      score: d.score || 0,
      created: d.created_utc || 0,
      permalink: d.permalink ? "https://www.reddit.com" + d.permalink : ""
    };
  }

  async function fetchPage(user, after) {
    const params = { limit: 100, sort: "new", raw_json: 1 };
    if (after) params.after = after;
    const path = "/user/" + encodeURIComponent(user) + "/overview.json";
    try {
      return await RPPM.apiGet(path, params);
    } catch (err) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) qs.set(k, v);
      return await RPPM.bgFetch("https://old.reddit.com" + path + "?" + qs.toString());
    }
  }

  function readFilters() {
    if (!containerEl) return {};
    return {
      type: containerEl.querySelector("#rppm-clean-type").value,
      sub: containerEl.querySelector("#rppm-clean-sub").value.trim().toLowerCase().replace(/^r\//, ""),
      days: parseInt(containerEl.querySelector("#rppm-clean-days").value || "0", 10),
      maxScore:
        containerEl.querySelector("#rppm-clean-score").value === ""
          ? null
          : parseInt(containerEl.querySelector("#rppm-clean-score").value, 10),
      limit: Math.max(1, parseInt(containerEl.querySelector("#rppm-clean-limit").value || "100", 10))
    };
  }

  function applyFilters(items, filters) {
    const cutoff = filters.days > 0 ? Date.now() / 1000 - filters.days * 86400 : 0;
    return items.filter((item) => {
      if (filters.type !== "all" && item.type !== filters.type) return false;
      if (filters.sub && !item.subreddit.toLowerCase().includes(filters.sub)) return false;
      if (cutoff && item.created > cutoff) return false;
      if (filters.maxScore !== null && !isNaN(filters.maxScore) && item.score > filters.maxScore) return false;
      return true;
    });
  }

  async function preview() {
    if (ui.loading || ui.running) return;
    ui.loading = true;
    ui.selected.clear();
    setStatus("Gönderiler getiriliyor…");
    try {
      const me = await RPPM.getMe();
      ui.user = me.name;
      const filters = readFilters();
      const wanted = filters.limit;
      const collected = [];
      let after = null;
      let pages = 0;
      const maxPages = RPPM.get("cleanup.maxPages", 20);

      while (collected.length < wanted && pages < maxPages) {
        const json = await fetchPage(ui.user, after);
        const children = (json.data && json.data.children) || [];
        if (!children.length) break;
        for (const child of children) {
          const item = mapItem(child);
          if (item) collected.push(item);
        }
        after = json.data.after || null;
        pages++;
        setStatus("Getiriliyor… " + collected.length + " öğe (" + pages + " sayfa)");
        if (!after) break;
        await RPPM.sleep(350);
      }

      ui.items = applyFilters(collected, filters).slice(0, wanted);
      ui.fetchedAt = Date.now();
      renderList();
      setStatus(ui.items.length + " öğe bulundu · " + pages + " sayfa tarandı");
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

  function setProgress(done, total) {
    if (!progressEl) return;
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressEl.innerHTML =
      '<div class="rppm-progress"><div class="rppm-progress-bar" style="width:' +
      pct +
      '%"></div></div>' +
      '<div class="rppm-muted">' +
      done +
      " / " +
      total +
      " (%" +
      pct +
      ")</div>";
  }

  function appendLog(line) {
    ui.log.unshift(new Date().toLocaleTimeString("tr-TR") + " · " + line);
    ui.log = ui.log.slice(0, 200);
    if (logEl) {
      logEl.innerHTML = ui.log
        .slice(0, 30)
        .map((entry) => '<div class="rppm-log-line">' + RPPM.escapeHtml(entry) + "</div>")
        .join("");
    }
  }

  function renderList() {
    if (!listEl) return;
    if (!ui.items.length) {
      listEl.innerHTML = '<div class="rppm-empty">Henüz öğe yok. Filtreleri ayarlayıp “Önizle”ye basın.</div>';
      updateSelection();
      return;
    }

    listEl.innerHTML = ui.items
      .map((item) => {
        const checked = ui.selected.has(item.id) ? " checked" : "";
        return (
          '<div class="rppm-list-item" data-id="' +
          RPPM.escapeHtml(item.id) +
          '">' +
          '<input type="checkbox" class="rppm-check" data-id="' +
          RPPM.escapeHtml(item.id) +
          '"' +
          checked +
          ">" +
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
          " · " +
          RPPM.formatNumber(item.score) +
          " puan · " +
          RPPM.formatDate(item.created) +
          "</div></div></div>"
        );
      })
      .join("");
    updateSelection();
  }

  function updateSelection() {
    if (!containerEl) return;
    const label = containerEl.querySelector("#rppm-clean-selection");
    if (label) label.textContent = ui.selected.size + " seçili";
  }

  async function deleteSelected() {
    if (ui.running) return;
    if (!ui.selected.size) {
      setStatus("Önce silinecek öğeleri seçin.", true);
      return;
    }

    const count = ui.selected.size;
    const answer = window.prompt(
      count +
        " öğe KALICI olarak silinecek. Bu işlem geri alınamaz.\n\nOnaylamak için DELETE yazın:"
    );
    if (answer !== "DELETE") {
      setStatus("İptal edildi.", false);
      return;
    }

    ui.running = true;
    ui.stop = false;
    const ids = Array.from(ui.selected);
    let done = 0;
    let failed = 0;
    setProgress(0, ids.length);
    appendLog("Silme başladı: " + ids.length + " öğe");

    for (const id of ids) {
      if (ui.stop) {
        appendLog("Kullanıcı tarafından durduruldu.");
        break;
      }
      try {
        await RPPM.apiPost("/api/del", { id });
        ui.items = ui.items.filter((item) => item.id !== id);
        ui.selected.delete(id);
        done++;
        RPPM.stats.bump("deleted", 1);
        appendLog("Silindi: " + id);
      } catch (err) {
        if (err.status === 429) {
          appendLog("Hız sınırı (429). 6 sn bekleniyor…");
          await RPPM.sleep(6000);
          try {
            await RPPM.apiPost("/api/del", { id });
            ui.items = ui.items.filter((item) => item.id !== id);
            ui.selected.delete(id);
            done++;
            appendLog("Silindi (tekrar): " + id);
          } catch (retryErr) {
            failed++;
            appendLog("Başarısız: " + id + " · " + retryErr.message);
          }
        } else {
          failed++;
          appendLog("Başarısız: " + id + " · " + err.message);
          if (err.status === 403) {
            appendLog("403: oturum veya izin sorunu. İşlem durduruldu.");
            break;
          }
        }
      }
      setProgress(done + failed, ids.length);
      renderList();
      await RPPM.sleep(RPPM.get("cleanup.rateMs", 1200));
    }

    ui.running = false;
    setProgress(done + failed, ids.length);
    setStatus(done + " silindi" + (failed ? " · " + failed + " başarısız" : ""), failed > 0);
    appendLog("Bitti: " + done + " silindi, " + failed + " başarısız.");
    try {
      await browser.storage.local.set({ cleanupLog: ui.log.slice(0, 200) });
    } catch (err) {
      /* ignore */
    }
  }

  async function render(container) {
    containerEl = container;
    container.innerHTML =
      '<div class="rppm-section">' +
      '<div class="rppm-warning">' +
      "Bu araç gönderi ve yorumlarınızı Reddit üzerinden <strong>kalıcı olarak</strong> siler. " +
      "Önce önizleyin, ardından yalnızca seçtiklerinizi silin. Reddit API hız sınırına takılmamak için " +
      "işlemler arasında beklenir." +
      "</div>" +
      '<div class="rppm-row rppm-wrap">' +
      '<select id="rppm-clean-type" class="rppm-select">' +
      '<option value="all">Tümü</option>' +
      '<option value="post">Gönderiler</option>' +
      '<option value="comment">Yorumlar</option>' +
      "</select>" +
      '<input id="rppm-clean-sub" class="rppm-input rppm-input-sm" placeholder="r/subreddit">' +
      '<input id="rppm-clean-days" class="rppm-input rppm-input-xs" type="number" min="0" placeholder="gün ≤" title="Belirtilen günden eski">' +
      '<input id="rppm-clean-score" class="rppm-input rppm-input-xs" type="number" placeholder="puan ≤" title="Bu puan veya altındakiler">' +
      '<input id="rppm-clean-limit" class="rppm-input rppm-input-xs" type="number" min="1" value="100" placeholder="limit" title="En fazla taranacak öğe">' +
      "</div>" +
      '<div class="rppm-row rppm-wrap">' +
      '<button id="rppm-clean-preview" class="rppm-btn">Önizle</button>' +
      '<button id="rppm-clean-delete" class="rppm-btn rppm-btn-danger">Seçilenleri sil</button>' +
      '<button id="rppm-clean-stop" class="rppm-btn">Durdur</button>' +
      '<button id="rppm-clean-selectall" class="rppm-btn rppm-btn-sm">Tümünü seç</button>' +
      '<span id="rppm-clean-selection" class="rppm-muted">0 seçili</span>' +
      "</div>" +
      '<div id="rppm-clean-status" class="rppm-muted"></div>' +
      '<div id="rppm-clean-progress"></div>' +
      "</div>" +
      '<div id="rppm-clean-list" class="rppm-list"></div>' +
      '<div class="rppm-section"><div class="rppm-section-title">İşlem günlüğü</div>' +
      '<div id="rppm-clean-log" class="rppm-log"></div></div>';

    listEl = container.querySelector("#rppm-clean-list");
    statusEl = container.querySelector("#rppm-clean-status");
    progressEl = container.querySelector("#rppm-clean-progress");
    logEl = container.querySelector("#rppm-clean-log");

    container.querySelector("#rppm-clean-preview").addEventListener("click", preview);
    container.querySelector("#rppm-clean-delete").addEventListener("click", deleteSelected);
    container.querySelector("#rppm-clean-stop").addEventListener("click", () => {
      ui.stop = true;
      appendLog("Durdurma isteği alındı…");
    });
    container.querySelector("#rppm-clean-selectall").addEventListener("click", () => {
      const allSelected = ui.items.every((item) => ui.selected.has(item.id));
      if (allSelected) ui.selected.clear();
      else ui.items.forEach((item) => ui.selected.add(item.id));
      renderList();
    });

    listEl.addEventListener("change", (event) => {
      const box = event.target.closest('input[type="checkbox"][data-id]');
      if (!box) return;
      if (box.checked) ui.selected.add(box.dataset.id);
      else ui.selected.delete(box.dataset.id);
      updateSelection();
    });

    renderList();
    if (logEl) {
      logEl.innerHTML = ui.log
        .slice(0, 30)
        .map((entry) => '<div class="rppm-log-line">' + RPPM.escapeHtml(entry) + "</div>")
        .join("");
    }

    try {
      const me = await RPPM.getMe();
      ui.user = me.name;
      setStatus("u/" + me.name + " olarak giriş yapıldı");
    } catch (err) {
      setStatus("Giriş yapılmamış olabilir: " + err.message, true);
    }
  }

  RPPM.cleanup = { render, preview, deleteSelected };

  RPPM.registerModule("cleanup", {
    init() {
      // UI-driven.
    }
  });
})();
