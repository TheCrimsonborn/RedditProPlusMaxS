(async function () {
  "use strict";

  if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
    globalThis.browser = globalThis.chrome;
  }

  await RPPM.load();

  const sectionsEl = document.getElementById("sections");
  const statusEl = document.getElementById("save-status");
  const pending = new Map();
  let saveTimer = null;

  function fill() {
    sectionsEl.querySelectorAll("[data-path]").forEach((input) => {
      const value = RPPM.get(input.dataset.path);
      if (input.type === "checkbox") {
        input.checked = !!value;
      } else if (Array.isArray(value)) {
        input.value = value.join("\n");
      } else if (value == null) {
        input.value = "";
      } else {
        input.value = value;
      }
    });
  }

  function readValue(input) {
    if (input.type === "checkbox") return input.checked;
    if (input.type === "number") {
      const n = parseFloat(input.value);
      return isNaN(n) ? 0 : n;
    }
    if (input.tagName === "TEXTAREA") {
      return input.value
        .split(/[\n,]+/)
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return input.value;
  }

  function setIn(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function showStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = isError ? "var(--danger)" : "var(--ok)";
    statusEl.classList.add("show");
    clearTimeout(showStatus._timer);
    showStatus._timer = setTimeout(() => statusEl.classList.remove("show"), 1500);
  }

  async function flush() {
    if (!pending.size) return;
    for (const [path, value] of pending) setIn(RPPM.settings, path, value);
    pending.clear();
    await RPPM.save();
    showStatus("Kaydedildi");
  }

  function queue(path, value) {
    pending.set(path, value);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 300);
  }

  // Delegated input / change events for all settings
  sectionsEl.addEventListener("input", (event) => {
    const input = event.target.closest("[data-path]");
    if (!input) return;
    if (input.type === "checkbox" || input.tagName === "SELECT") return;
    queue(input.dataset.path, readValue(input));
  });

  sectionsEl.addEventListener("change", (event) => {
    const input = event.target.closest("[data-path]");
    if (!input) return;
    queue(input.dataset.path, readValue(input));
  });

  // Filter tab switcher
  const filterTabs = document.querySelectorAll(".filter-tab");
  const filterTextareas = document.querySelectorAll(".filter-textarea");
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      filterTextareas.forEach((ta) => ta.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add("active");
    });
  });

  // Export
  document.getElementById("export").addEventListener("click", () => {
    const blob = new Blob([RPPM.exportSettings()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reddit-pro-plus-max-s-ayarlar.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showStatus("Dışa aktarıldı");
  });

  // Import
  document.getElementById("import").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      await RPPM.importSettings(text);
      fill();
      showStatus("İçe aktarıldı");
    } catch (err) {
      showStatus("Hata: " + err.message, true);
    }
    event.target.value = "";
  });

  // Reset
  document.getElementById("reset").addEventListener("click", async () => {
    if (!window.confirm("Tüm ayarlar varsayılana dönecek. Emin misiniz?")) return;
    await RPPM.reset();
    fill();
    showStatus("Sıfırlandı");
  });

  fill();

  window.addEventListener("beforeunload", () => {
    if (pending.size) {
      for (const [path, value] of pending) setIn(RPPM.settings, path, value);
      RPPM.save();
    }
  });
})();
