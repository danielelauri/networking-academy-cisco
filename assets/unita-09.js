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

  const setPressed = (selector, selected, dataKey) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
    });
  };

  const policyMap = document.getElementById("u9PolicyMap");
  const policyTitle = document.getElementById("u9PolicyTitle");
  const policyText = document.getElementById("u9PolicyText");
  const sharedNotes = [...policyMap.querySelectorAll(".u9-shared-note")];
  const policyStates = {
    isolated: {
      title: "Isolamento: ogni VRF importa il proprio RT",
      text: "Le rotte Blu portano RT 65000:100; le rotte Ambra portano RT 65000:200. La presenza nello stesso MP-BGP non implica importazione reciproca.",
      notes: ["nessuna rotta Ambra", "nessuna rotta Blu"],
      aria: "Le VRF Blu e Ambra importano Route Target differenti e restano isolate."
    },
    extranet: {
      title: "Extranet: entrambe importano un RT condiviso",
      text: "Le rotte selezionate del servizio comune portano anche RT 65000:999. Le due VRF lo importano senza dover importare tutte le rotte private dell’altra VPN.",
      notes: ["importa anche RT 65000:999", "importa anche RT 65000:999"],
      aria: "Le VRF Blu e Ambra restano separate ma importano entrambe le rotte selezionate con Route Target condiviso 65000:999."
    }
  };
  const showPolicy = (key) => {
    const state = policyStates[key];
    setPressed("[data-u9-policy]", key, "u9Policy");
    policyMap.dataset.mode = key;
    policyMap.setAttribute("aria-label", state.aria);
    sharedNotes.forEach((note, index) => { note.textContent = state.notes[index]; });
    policyTitle.textContent = state.title;
    policyText.textContent = state.text;
  };
  document.querySelectorAll("[data-u9-policy]").forEach((button) => {
    button.addEventListener("click", () => showPolicy(button.dataset.u9Policy));
  });
  showPolicy("isolated");

  const routeFlow = document.getElementById("u9RouteFlow");
  const routeTitle = document.getElementById("u9RouteTitle");
  const routeText = document.getElementById("u9RouteText");
  const routeNodes = [...routeFlow.querySelectorAll("[data-u9-route-node]")];
  const routeOrder = ["learn", "vpnize", "advertise", "import", "install"];
  const routeStates = {
    learn: {
      title: "1 · PE-B apprende la rotta dal CE-B",
      text: "Il protocollo PE–CE o una rotta statica inserisce 10.20.20.0/24 nella VRF BLU. Non esiste ancora una rotta VPNv4 da distribuire.",
      aria: "PE-B apprende 10.20.20.0/24 da CE-B nella VRF Blu."
    },
    vpnize: {
      title: "2 · PE-B costruisce una rotta VPNv4",
      text: "PE-B antepone il RD 65000:102, applica RT 65000:100 e associa la label di servizio 24001. Il prefisso cliente diventa distinguibile dagli eventuali prefissi sovrapposti.",
      aria: "PE-B trasforma la rotta Blu in VPNv4 aggiungendo Route Distinguisher, Route Target e label di servizio."
    },
    advertise: {
      title: "3 · MP-BGP distribuisce la rotta",
      text: "L’UPDATE porta la NLRI VPNv4 etichettata, gli attributi e PE-B come next hop. Un Route Reflector può rifletterla senza importarla in una VRF cliente.",
      aria: "MP-BGP distribuisce la rotta VPNv4 etichettata da PE-B verso PE-A, eventualmente tramite Route Reflector."
    },
    import: {
      title: "4 · PE-A applica la policy di importazione",
      text: "La VRF BLU di PE-A importa la rotta perché accetta RT 65000:100. Una VRF priva di quel Route Target non riceve automaticamente il prefisso.",
      aria: "PE-A confronta Route Target 65000:100 e importa la rotta soltanto nella VRF Blu autorizzata."
    },
    install: {
      title: "5 · La VRF BLU prepara il forwarding",
      text: "PE-A conserva 10.20.20.0/24 nel contesto Blu con next hop PE-B e label 24001. La FIB per-VRF potrà ora guidare il successivo traffico cliente.",
      aria: "PE-A installa 10.20.20.0/24 nella VRF Blu con next hop PE-B e label di servizio 24001."
    }
  };
  const showRoute = (key) => {
    const state = routeStates[key];
    const selectedIndex = routeOrder.indexOf(key);
    setPressed("[data-u9-route]", key, "u9Route");
    routeFlow.dataset.step = key;
    routeFlow.setAttribute("aria-label", state.aria);
    routeNodes.forEach((node, index) => {
      node.classList.toggle("u9-active", index === selectedIndex);
      node.classList.toggle("u9-done", index < selectedIndex);
    });
    routeTitle.textContent = state.title;
    routeText.textContent = state.text;
  };
  document.querySelectorAll("[data-u9-route]").forEach((button) => {
    button.addEventListener("click", () => showRoute(button.dataset.u9Route));
  });
  showRoute("learn");

  const corePath = document.getElementById("u9CorePath");
  const packetStack = document.getElementById("u9PacketStack");
  const transportLabel = document.getElementById("u9TransportLabel");
  const transportText = document.getElementById("u9TransportText");
  const hopTitle = document.getElementById("u9HopTitle");
  const hopText = document.getElementById("u9HopText");
  const hopNodes = [...corePath.querySelectorAll("[data-u9-hop-node]")];
  const hopStates = {
    ingress: {
      label: "LABEL 18",
      labelText: "trasporto verso PE-B",
      title: "PE-A: due push dopo il lookup nella VRF",
      text: "PE-A mantiene 24001 come label interna e aggiunge sopra 18, ricevuta dal proprio next hop per raggiungere PE-B. Una nuova trama Layer 2 trasporta lo stack sul primo link del core.",
      pathAria: "PE-A impone la label esterna 18 e la label interna 24001 sul datagramma cliente.",
      stackAria: "Stack dopo PE-A: trama Layer 2, label di trasporto 18, label di servizio 24001, datagramma IP cliente e dati."
    },
    p1: {
      label: "LABEL 27",
      labelText: "nuovo valore di trasporto",
      title: "P1: cambia soltanto la label superiore",
      text: "P1 consulta 18 nella LFIB e la sostituisce con 27. Non esegue un lookup sulla destinazione cliente e lascia invariata la label interna 24001.",
      pathAria: "P1 sostituisce la label di trasporto 18 con 27 e conserva la label di servizio 24001.",
      stackAria: "Stack dopo P1: nuova trama Layer 2, label di trasporto 27, label di servizio 24001, datagramma IP cliente e dati."
    },
    p2: {
      label: "LABEL 27",
      labelText: "rimossa da P2",
      title: "P2: Penultimate Hop Popping",
      text: "P2 rimuove la label di trasporto 27. Sul collegamento finale verso PE-B la label 24001 diventa la superiore; il datagramma cliente resta incapsulato sotto di essa.",
      pathAria: "P2 rimuove la label di trasporto 27; verso PE-B resta la label di servizio 24001.",
      stackAria: "Stack dopo P2: nuova trama Layer 2, label di servizio 24001, datagramma IP cliente e dati."
    },
    egress: {
      label: "NESSUNA LABEL DI TRASPORTO",
      labelText: "PE-B è il next hop BGP",
      title: "PE-B: la label di servizio seleziona l’azione",
      text: "PE-B riceve 24001, esegue l’azione programmata per quella label e rimuove l’incapsulamento MPLS. Il successivo lookup o l’adiacenza d’uscita consegna il datagramma al CE-B nella VRF BLU.",
      pathAria: "PE-B usa e rimuove la label di servizio 24001 per consegnare il datagramma alla VRF Blu.",
      stackAria: "Dopo l’elaborazione di PE-B restano la nuova trama Layer 2 verso CE-B, il datagramma IP cliente e i dati."
    }
  };
  const showHop = (key) => {
    const state = hopStates[key];
    setPressed("[data-u9-hop]", key, "u9Hop");
    corePath.dataset.hop = key;
    packetStack.dataset.hop = key;
    corePath.setAttribute("aria-label", state.pathAria);
    packetStack.setAttribute("aria-label", state.stackAria);
    hopNodes.forEach((node) => node.classList.toggle("u9-active", node.dataset.u9HopNode === key));
    transportLabel.textContent = state.label;
    transportText.textContent = state.labelText;
    hopTitle.textContent = state.title;
    hopText.textContent = state.text;
  };
  document.querySelectorAll("[data-u9-hop]").forEach((button) => {
    button.addEventListener("click", () => showHop(button.dataset.u9Hop));
  });
  showHop("ingress");
})();
