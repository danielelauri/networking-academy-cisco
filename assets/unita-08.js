(() => {
  const themeToggle = document.getElementById("themeToggle");
  const themeCurrent = document.getElementById("themeCurrent");
  const applyTheme = (theme, persist = true) => {
    const light = theme === "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
    themeToggle.checked = light;
    themeToggle.setAttribute("aria-checked", String(light));
    themeToggle.setAttribute("aria-label", light ? "Attiva il tema scuro" : "Attiva il tema chiaro");
    themeCurrent.textContent = light ? "Chiaro" : "Scuro";
    if (persist) {
      try { localStorage.setItem("network-academy-theme", light ? "light" : "dark"); } catch (_) {}
    }
  };
  applyTheme(document.documentElement.dataset.theme || "dark", false);
  themeToggle.addEventListener("change", () => applyTheme(themeToggle.checked ? "light" : "dark"));

  const setPressed = (selector, selected, attribute) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[attribute] === selected));
    });
  };

  const mesh = document.getElementById("u8MeshDiagram");
  const meshConnections = document.getElementById("u8MeshConnections");
  const meshTitle = document.getElementById("u8MeshTitle");
  const meshText = document.getElementById("u8MeshText");
  const meshNodes = [...mesh.querySelectorAll(".u8-mesh-node span")];
  const showMesh = (mode) => {
    setPressed("[data-u8-mesh]", mode, "u8Mesh");
    mesh.dataset.mode = mode;
    if (mode === "mesh") {
      mesh.setAttribute("aria-label", "Full mesh iBGP con quattro router e sei sessioni: A–B, A–C, A–D, B–C, B–D e C–D");
      meshNodes.forEach((node) => { node.textContent = "router iBGP"; });
      meshConnections.textContent = "Sessioni: A–B · A–C · A–D · B–C · B–D · C–D";
      meshTitle.textContent = "Full mesh: 6 sessioni fra 4 router";
      meshText.textContent = "Ciascuno dei quattro router mantiene una sessione iBGP con gli altri tre. Il numero di sessioni è n × (n − 1) / 2.";
    } else {
      mesh.setAttribute("aria-label", "Due Route Reflector ridondanti A e B; due client C e D; cinque sessioni: A–B, A–C, A–D, B–C e B–D");
      meshNodes.forEach((node, index) => { node.textContent = index < 2 ? "Route Reflector" : "client"; });
      meshConnections.textContent = "Sessioni: A–B · A–C · A–D · B–C · B–D";
      meshTitle.textContent = "Due reflector: 5 sessioni in questo esempio minimo";
      meshText.textContent = "C e D sono client di entrambi i reflector e non hanno una sessione diretta fra loro. Il vantaggio cresce con il numero dei client; resta necessaria la sessione fra i due RR e una policy coerente.";
    }
  };
  document.querySelectorAll("[data-u8-mesh]").forEach((button) => button.addEventListener("click", () => showMesh(button.dataset.u8Mesh)));
  showMesh("mesh");

  const policyTitle = document.getElementById("u8PolicyTitle");
  const policyText = document.getElementById("u8PolicyText");
  const pathA = document.getElementById("u8PathA");
  const pathB = document.getElementById("u8PathB");
  const prefA = document.getElementById("u8PrefA");
  const prefB = document.getElementById("u8PrefB");
  const policy = {
    "prefer-a": { a: 200, b: 100, choice: "a", title: "Scelto A: prevale la policy locale", text: "LOCAL_PREF 200 supera 100. La sequenza AS più lunga di A non rende automaticamente preferibile B." },
    equal: { a: 100, b: 100, choice: "b", title: "Scelto B nel confronto semplificato", text: "A parità di LOCAL_PREF e degli altri fattori assunti equivalenti, la sequenza AS_PATH più corta di B prevale in questo esempio." },
    "prefer-b": { a: 100, b: 200, choice: "b", title: "Scelto B: la policy favorisce il vicino B", text: "LOCAL_PREF 200 per B supera 100 per A. La lunghezza di AS_PATH non serve a decidere questo confronto." }
  };
  const showPolicy = (key) => {
    const state = policy[key];
    setPressed("[data-u8-policy]", key, "u8Policy");
    prefA.textContent = state.a;
    prefB.textContent = state.b;
    pathA.classList.toggle("u8-selected", state.choice === "a");
    pathB.classList.toggle("u8-selected", state.choice === "b");
    policyTitle.textContent = state.title;
    policyText.textContent = state.text;
  };
  document.querySelectorAll("[data-u8-policy]").forEach((button) => button.addEventListener("click", () => showPolicy(button.dataset.u8Policy)));
  showPolicy("prefer-a");
})();
