/* Interruttore del tema chiaro/scuro, comune a tutte le unità.
   La scelta è salvata in localStorage ("network-academy-theme") e vale per tutto il percorso;
   lo script inline nell'<head> di ogni pagina la applica prima del disegno, per evitare lampi. */
(() => {
  const themeToggle = document.getElementById("themeToggle");
  const themeCurrent = document.getElementById("themeCurrent");
  if (!themeToggle) return;

  const applyTheme = (theme, persist = true) => {
    const light = theme === "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
    themeToggle.checked = light;
    themeToggle.setAttribute("aria-checked", String(light));
    themeToggle.setAttribute("aria-label", light ? "Attiva il tema scuro" : "Attiva il tema chiaro");
    if (themeCurrent) themeCurrent.textContent = light ? "Chiaro" : "Scuro";
    if (persist) {
      try { localStorage.setItem("network-academy-theme", light ? "light" : "dark"); } catch (_) {}
    }
  };

  applyTheme(document.documentElement.dataset.theme || "dark", false);
  themeToggle.addEventListener("change", () => applyTheme(themeToggle.checked ? "light" : "dark"));
})();
