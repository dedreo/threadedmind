(function () {
  const root = document.documentElement;
  const THEME_KEY = "tm:theme";
  const FILTER_KEY = "tm:filters";

  // THEME SELECT
  const themeSelect = document.getElementById("themeSelect");

  if (themeSelect) {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (
        savedTheme === "dark" ||
        savedTheme === "light" ||
        savedTheme === "terminal"
      ) {
        root.setAttribute("data-theme", savedTheme);
        themeSelect.value = savedTheme;
      }
    } catch (e) {}

    themeSelect.addEventListener("change", () => {
      const value = themeSelect.value;
      root.setAttribute("data-theme", value);
      try {
        localStorage.setItem(THEME_KEY, value);
      } catch (e) {}
    });
  }

  async function loadSidebar() {
  const host = document.getElementById("tmSidebar");
  if (!host) return;

  // Find the script tag that loaded main.js
  const scriptEl = document.querySelector('script[src$="/scripts/main.js"], script[src*="/scripts/main.js?"]');
  const scriptSrc = scriptEl ? scriptEl.src : new URL("/scripts/main.js", window.location.href).href;

  const scriptUrl = new URL(scriptSrc, window.location.href);
  const basePath = scriptUrl.pathname.replace(/\/scripts\/main\.js$/, "");

  const sidebarUrl = `${basePath}/partials/sidebar.html`;

  try {
    const res = await fetch(sidebarUrl);
    if (!res.ok) throw new Error(`Sidebar fetch failed: ${res.status}`);
    host.innerHTML = await res.text();
  } catch (e) {
    console.error("Sidebar error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadSidebar);

  // FILTERS (LOGS PAGE)
  const tagFilterBoxes = Array.from(
    document.querySelectorAll(".filter-checkbox")
  );

  const modeButtons = Array.from(
    document.querySelectorAll(".mode-toggle")
  );

  const defaultTagFilterState = new Map(
    tagFilterBoxes.map((box) => [box.dataset.key, box.checked])
  );

  const defaultModeState = new Map(
    modeButtons.map((button) => [
      button.dataset.mode,
      button.classList.contains("is-active"),
    ])
  );

  function setAllTagFilters(checked) {
    tagFilterBoxes.forEach((box) => {
      box.checked = checked;
    });
  }

  function restoreDefaultTagFilters() {
    tagFilterBoxes.forEach((box) => {
      box.checked = defaultTagFilterState.get(box.dataset.key) ?? false;
    });
  }

  function restoreDefaultModes() {
    modeButtons.forEach((button) => {
      const active = defaultModeState.get(button.dataset.mode) ?? true;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  if (tagFilterBoxes.length || modeButtons.length) {
    try {
      const savedFilters = JSON.parse(localStorage.getItem(FILTER_KEY));
      if (savedFilters && typeof savedFilters === "object") {
        if (savedFilters.tags && typeof savedFilters.tags === "object") {
          tagFilterBoxes.forEach((box) => {
            const key = box.dataset.key;
            if (key in savedFilters.tags) {
              box.checked = !!savedFilters.tags[key];
            }
          });
        }

        if (savedFilters.modes && typeof savedFilters.modes === "object") {
          modeButtons.forEach((button) => {
            const mode = button.dataset.mode;
            const active =
              mode in savedFilters.modes ? !!savedFilters.modes[mode] : true;

            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
          });
        }
      }
    } catch (e) {}

    function saveFilters() {
      const state = {
        tags: {},
        modes: {},
      };

      tagFilterBoxes.forEach((box) => {
        state.tags[box.dataset.key] = box.checked;
      });

      modeButtons.forEach((button) => {
        state.modes[button.dataset.mode] =
          button.classList.contains("is-active");
      });

      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(state));
      } catch (e) {}
    }

    function applyLogFilters() {
      const rows = Array.from(document.querySelectorAll(".logs-ledger .row"));
      if (!rows.length) return;

      const checkedTags = tagFilterBoxes
        .filter((cb) => cb.checked)
        .map((cb) => cb.dataset.key);

      const activeModes = modeButtons
        .filter((button) => button.classList.contains("is-active"))
        .map((button) => button.dataset.mode);

      rows.forEach((row) => {
        const tags = (row.dataset.tags || "").split(/\s+/).filter(Boolean);
        const modes = (row.dataset.modes || "").split(/\s+/).filter(Boolean);

        const tagMatch =
          checkedTags.length > 0 && checkedTags.some((t) => tags.includes(t));

        const modeMatch =
          activeModes.length === 0 ||
          activeModes.some((m) => modes.includes(m));

        row.hidden = !(tagMatch && modeMatch);
      });

      const monthRows = document.querySelectorAll(".month-row");

      monthRows.forEach((month) => {
        let next = month.nextElementSibling;
        let visible = false;

        while (next && !next.classList.contains("month-row")) {
          if (!next.hidden) {
            visible = true;
            break;
          }
          next = next.nextElementSibling;
        }

        month.hidden = !visible;
      });
    }

    tagFilterBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        saveFilters();
        applyLogFilters();
      });
    });

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const active = !button.classList.contains("is-active");
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");

        saveFilters();
        applyLogFilters();
      });
    });

    const filterActionButtons = document.querySelectorAll("[data-filter-action]");

    filterActionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.filterAction;

        if (action === "all") {
          setAllTagFilters(true);
        } else if (action === "none") {
          setAllTagFilters(false);
        } else if (action === "default") {
          restoreDefaultTagFilters();
          restoreDefaultModes();
        } else {
          return;
        }

        saveFilters();
        applyLogFilters();
      });
    });

    applyLogFilters();
  }
  
  // LATEST POST EXPAND/COLLAPSE (HOME)
  const latestBody = document.getElementById("latestBody");
  
function tmHighlightSpeakers(rootEl = document) {
  const logPres = rootEl.querySelectorAll(".log-pre");
  logPres.forEach((pre) => {
    let html = pre.innerHTML;

    html = html.replace(
      /^(\s*)You said:/gm,
      '$1<span class="speaker speaker-user">User said:</span>'
    );

    html = html.replace(
      /^(\s*)ChatGPT said:/gm,
      '$1<span class="speaker speaker-gpt">ChatGPT said:</span>'
    );

    pre.innerHTML = html;
  });
}

// run on normal pages immediately
tmHighlightSpeakers(document);

// expose for pages that inject logs dynamically
window.tmHighlightSpeakers = tmHighlightSpeakers;


   // ABOUT ACCORDIONS
  const aboutBlocks = document.querySelectorAll(".about-block");
  const aboutToggles = document.querySelectorAll(".about-toggle");

  if (aboutBlocks.length && aboutToggles.length) {
    // Attach simple toggle handlers
    aboutToggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const block = btn.closest(".about-block");
        if (!block) return;

        // Toggle only this block
        block.classList.toggle("open");
      });
    });

    // On load: open the hashed section if present, otherwise open "who"
    const hash = window.location.hash.slice(1);
    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        target.classList.add("open");
      }
    } else {
      const whoBlock = document.getElementById("who");
      if (whoBlock) {
        whoBlock.classList.add("open");
      }
    }
  }
})();