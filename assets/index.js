(() => {
  const toggle = document.getElementById("themeToggle");
  const current = document.getElementById("themeCurrent");

  const applyTheme = (theme, persist = true) => {
    const light = theme === "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
    toggle.checked = light;
    toggle.setAttribute("aria-checked", String(light));
    toggle.setAttribute("aria-label", light ? "Attiva il tema scuro" : "Attiva il tema chiaro");
    current.textContent = light ? "Chiaro" : "Scuro";
    if (persist) {
      try { localStorage.setItem("network-academy-theme", light ? "light" : "dark"); } catch (_) {}
    }
  };

  applyTheme(document.documentElement.dataset.theme || "dark", false);
  toggle.addEventListener("change", () => applyTheme(toggle.checked ? "light" : "dark"));
})();
