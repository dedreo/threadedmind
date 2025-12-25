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


  // FILTER CHECKBOXES (HOME PAGE)
  const filterBoxes = Array.from(
    document.querySelectorAll(".filter-checkbox")
  );

  if (filterBoxes.length) {
    try {
      const savedFilters = JSON.parse(localStorage.getItem(FILTER_KEY));
      if (savedFilters && typeof savedFilters === "object") {
        filterBoxes.forEach((box) => {
          const key = box.dataset.key;
          if (key in savedFilters) {
            box.checked = !!savedFilters[key];
          }
        });
      }
    } catch (e) {}

    function saveFilters() {
      const state = {};
      filterBoxes.forEach((box) => {
        state[box.dataset.key] = box.checked;
      });
      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(state));
      } catch (e) {}
    }

    filterBoxes.forEach((box) => {
      box.addEventListener("change", saveFilters);
    });
  }

  // LATEST POST EXPAND/COLLAPSE (HOME)
  const latestBody = document.getElementById("latestBody");
  const expandBtn = document.getElementById("expandBtn");

  if (latestBody && expandBtn) {
    expandBtn.addEventListener("click", () => {
      const collapsed = latestBody.classList.toggle("collapsed");
      expandBtn.textContent = collapsed ? "click to expand down" : "collapse";
      expandBtn.setAttribute("aria-expanded", String(!collapsed));
    });
  }
  
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