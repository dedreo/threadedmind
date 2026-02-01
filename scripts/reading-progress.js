(() => {
  const VISITED_KEY = "tm_visited_eids";
  const LAST_KEY = "tm_last_eid";

  const getVisited = () => {
    try { return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || "[]")); }
    catch { return new Set(); }
  };
  const setVisited = (set) => {
    localStorage.setItem(VISITED_KEY, JSON.stringify([...set]));
  };

  // Entry pages: mark visited + last read
  const entry = document.querySelector("[data-entry-eid]");
  if (entry) {
    const eid = entry.getAttribute("data-entry-eid");
    const visited = getVisited();
    visited.add(eid);
    setVisited(visited);
    localStorage.setItem(LAST_KEY, eid);
    return;
  }

  // Logs index: apply visited styles, capture clicks, auto-scroll to last
  const rows = document.querySelectorAll("li.row[data-eid]");
  if (!rows.length) return;

  const visited = getVisited();
  rows.forEach(row => {
    const eid = row.getAttribute("data-eid");
    if (visited.has(eid)) row.classList.add("visited");
  });

  rows.forEach(row => {
    const link = row.querySelector("a.link");
    if (!link) return;
    link.addEventListener("click", () => {
      const eid = row.getAttribute("data-eid");
      const visited = getVisited();
      visited.add(eid);
      setVisited(visited);
      localStorage.setItem(LAST_KEY, eid);
    });
  });

  const last = localStorage.getItem(LAST_KEY);
  if (last) {
    const target = document.getElementById(`eid-${last}`) || document.querySelector(`li.row[data-eid="${last}"]`);
    if (target) {
      target.scrollIntoView({ block: "center" });
      target.classList.add("last-read");
    }
  }
})();

(() => {
  const btn = document.getElementById("clearLocal");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!confirm("Clear local reading progress, filters, and theme settings?")) return;
    localStorage.clear();
    location.reload();
  });
})();

