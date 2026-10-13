(() => {
  const press = (buttons, selected, key) => buttons.forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset[key] === selected ? "true" : "false");
  });

  const ldpStates = {
    stable: ["Rotta e label coerenti", "La FIB sceglie P1 come next hop per PE-B; la LFIB usa la label appresa da P1 per inoltrare il pacchetto labeled."],
    changed: ["Il next hop è cambiato", "La rotta ora conduce attraverso un altro router. Il forwarding MPLS deve usare la label annunciata dal nuovo next hop; una vecchia associazione non descrive più il percorso corrente."],
    missing: ["Manca la label del next hop", "La rotta IP esiste, ma il binding utile per il next hop non è disponibile. Il router non può costruire la normale voce LFIB per quella FEC: vanno controllati peer, annuncio e convergenza." ]
  };
  const ldpButtons = [...document.querySelectorAll("[data-ldp-state]")];
  const ldpTitle = document.getElementById("ldpStateTitle");
  const ldpText = document.getElementById("ldpStateText");
  const showLdpState = (key) => {
    press(ldpButtons, key, "ldpState");
    [ldpTitle.textContent, ldpText.textContent] = ldpStates[key];
  };
  ldpButtons.forEach((button) => button.addEventListener("click", () => showLdpState(button.dataset.ldpState)));

  const distributionStates = {
    egress: {
      nodes: ["egress"], links: [],
      title: "PE-B annuncia il binding della FEC locale",
      text: "Per una FEC che termina su PE-B, può annunciare Implicit Null al router adiacente: così P2 rimuove la label di trasporto prima della consegna."
    },
    p2: {
      nodes: ["p2"], links: ["2b"],
      title: "P2 installa POP e annuncia la label L-B a P1",
      text: "P2 segue l’annuncio Implicit Null di PE-B e rimuove la label in uscita; per il tratto precedente annuncia a P1 la propria label locale L-B per la stessa FEC."
    },
    p1: {
      nodes: ["p1"], links: ["12", "2b"],
      title: "P1 annuncia la propria associazione a monte",
      text: "P1 conosce la label che P2 ha annunciato per la FEC e installa la corrispondente azione di uscita. I valori L-A, L-B e L-C sono simbolici: le label sono locali, non numeri da mantenere uguali lungo il percorso."
    },
    ingress: {
      nodes: ["ingress"], links: ["a1", "12", "2b"],
      title: "PE-A ha una catena di forwarding fino all’uscita",
      text: "Il router d’ingresso classifica il pacchetto nella FEC e applica la label L-A annunciata dal proprio next hop. P1 la sostituisce con L-B; P2 la rimuove prima di consegnare il pacchetto a PE-B."
    }
  };
  const distributionButtons = [...document.querySelectorAll("[data-ldp-step]")];
  const distributionNodes = [...document.querySelectorAll("[data-ldp-node]")];
  const distributionLinks = [...document.querySelectorAll("[data-ldp-link]")];
  const distributionTitle = document.getElementById("distributionTitle");
  const distributionText = document.getElementById("distributionText");
  const showDistribution = (key) => {
    const state = distributionStates[key];
    press(distributionButtons, key, "ldpStep");
    distributionNodes.forEach((node) => node.classList.toggle("active", state.nodes.includes(node.dataset.ldpNode)));
    distributionLinks.forEach((link) => link.classList.toggle("active", state.links.includes(link.dataset.ldpLink)));
    distributionTitle.textContent = state.title;
    distributionText.textContent = state.text;
  };
  distributionButtons.forEach((button) => button.addEventListener("click", () => showDistribution(button.dataset.ldpStep)));
  showDistribution("p1");

  const pathStates = {
    igp: ["L’IGP seleziona PE-A → P1 → P2 → PE-B", "È il percorso a costo illustrativo minore. Un LSP LDP basato sulla FEC verso PE-B segue normalmente i next hop IGP."],
    te: ["RSVP-TE segnala PE-A → P1 → P3 → PE-B", "Un tunnel può seguire questa alternativa se il percorso e i vincoli richiesti sono accettati dai router. Il pacchetto userà l’LSP del tunnel secondo la policy predisposta."]
  };
  const pathButtons = [...document.querySelectorAll("[data-path]")];
  const pathMap = document.querySelector(".path-map");
  const pathTitle = document.getElementById("pathTitle");
  const pathText = document.getElementById("pathText");
  const showPath = (key) => {
    press(pathButtons, key, "path");
    pathMap.dataset.activePath = key;
    [pathTitle.textContent, pathText.textContent] = pathStates[key];
  };
  pathButtons.forEach((button) => button.addEventListener("click", () => showPath(button.dataset.path)));
  showPath("igp");

  const srStates = {
    nodes: {
      title: "Un Node SID indica una destinazione nel dominio SR",
      text: "Il forwarding segue normalmente il percorso calcolato dall’IGP verso il nodo identificato. Un Node SID da solo non forza ogni collegamento intermedio."
    },
    links: {
      title: "Un Adjacency SID può indicare uno specifico collegamento",
      text: "Una policy può aggiungere istruzioni per imporre il passaggio su un’adiacenza particolare, poi continuare verso il nodo di uscita. Aumentano il controllo sul percorso e la complessità della lista."
    }
  };
  const srButtons = [...document.querySelectorAll("[data-sr-mode]")];
  const extraSrLabel = document.querySelector(".sr-label.extra");
  const srTitle = document.getElementById("srTitle");
  const srText = document.getElementById("srText");
  const showSrMode = (key) => {
    press(srButtons, key, "srMode");
    extraSrLabel.classList.toggle("inactive", key !== "links");
    srTitle.textContent = srStates[key].title;
    srText.textContent = srStates[key].text;
  };
  srButtons.forEach((button) => button.addEventListener("click", () => showSrMode(button.dataset.srMode)));
  showSrMode("nodes");
})();
