(() => {
  const setPressed = (buttons, active, key) => {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset[key] === active ? "true" : "false");
    });
  };

  const packetStates = {
    hello: {
      type: "1",
      payload: "parametri Hello e lista dei vicini conosciuti",
      title: "Hello: scoprire e mantenere i vicini.",
      text: "Verifica la compatibilità di parametri essenziali, rende visibile la comunicazione bidirezionale e partecipa all'elezione di Designated Router e Backup Designated Router sui segmenti multiaccess."
    },
    dbd: {
      type: "2",
      payload: "riepilogo degli header LSA presenti nella LSDB",
      title: "Database Description: confrontare il contenuto dei database.",
      text: "Durante EXSTART ed EXCHANGE i router negoziano la relazione primary-secondary, numerano i messaggi e descrivono sinteticamente le LSA conosciute."
    },
    lsr: {
      type: "3",
      payload: "identificatori delle LSA richieste",
      title: "Link State Request: chiedere le informazioni mancanti.",
      text: "Il router richiede al vicino una versione completa o più recente delle LSA individuate durante il confronto dei Database Description."
    },
    lsu: {
      type: "4",
      payload: "una o più Link State Advertisement complete",
      title: "Link State Update: trasportare le LSA.",
      text: "È il contenitore usato per flooding, risposta alle richieste e aggiornamento. Pacchetto LSU e singola LSA non sono sinonimi."
    },
    lsack: {
      type: "5",
      payload: "header delle LSA ricevute e confermate",
      title: "Link State Acknowledgment: rendere affidabile il flooding.",
      text: "Conferma la ricezione delle LSA; in assenza di acknowledgment il mittente può ritrasmettere secondo i meccanismi OSPF."
    }
  };

  const packetButtons = [...document.querySelectorAll("[data-packet]")];
  const packetType = document.getElementById("packetType");
  const packetPayload = document.getElementById("packetPayload");
  const packetTitle = document.getElementById("packetTitle");
  const packetText = document.getElementById("packetText");
  const showPacket = (key) => {
    const state = packetStates[key];
    setPressed(packetButtons, key, "packet");
    packetType.textContent = state.type;
    packetPayload.textContent = state.payload;
    packetTitle.textContent = state.title;
    packetText.textContent = state.text;
  };
  packetButtons.forEach((button) => button.addEventListener("click", () => showPacket(button.dataset.packet)));

  const neighborStates = {
    down: ["DOWN: nessun Hello valido ricevuto.", "Controlla innanzitutto interfaccia, abilitazione OSPF, passive-interface, filtri e compatibilità dei parametri Hello su entrambi i lati."],
    init: ["INIT: comunicazione unidirezionale.", "Il router riceve Hello dal vicino, ma il proprio Router ID non appare nella lista dei neighbor vista dal remoto. Verifica il percorso nella direzione opposta, filtri e multicast."],
    "2way": ["2-WAY: comunicazione bidirezionale.", "Può essere lo stato corretto fra due DROTHER su una rete broadcast. Su point-to-point o verso DR/BDR dovrebbe normalmente proseguire verso la piena adiacenza."],
    exstart: ["EXSTART: negoziazione dello scambio.", "I router scelgono primary e secondary e il numero di sequenza iniziale. Se lo stato persiste, controlla MTU, Router ID duplicati e negoziazione."],
    exchange: ["EXCHANGE: confronto mediante Database Description.", "Gli header LSA vengono confrontati. Uno stato bloccato suggerisce problemi di MTU, sequenze DBD o compatibilità nell'elaborazione dello scambio."],
    loading: ["LOADING: recupero delle LSA mancanti.", "Il router invia Link State Request e attende Link State Update. Se persiste, verifica le richieste non soddisfatte, la raggiungibilità unicast e i log."],
    full: ["FULL: Link State Database sincronizzata.", "I router sono completamente adiacenti. Se le rotte attese mancano ancora, la diagnosi deve proseguire su LSDB, calcolo SPF, selezione nella RIB, filtri o installazione nella FIB."]
  };

  const neighborButtons = [...document.querySelectorAll("[data-neighbor-state]")];
  const neighborTitle = document.getElementById("neighborTitle");
  const neighborText = document.getElementById("neighborText");
  const showNeighbor = (key) => {
    setPressed(neighborButtons, key, "neighborState");
    neighborTitle.textContent = neighborStates[key][0];
    neighborText.textContent = neighborStates[key][1];
  };
  neighborButtons.forEach((button) => button.addEventListener("click", () => showNeighbor(button.dataset.neighborState)));

  const floodStates = {
    "0": { routers: ["r1", "r2", "r3", "r4"], links: [], title: "Stato stabile.", text: "Tutti i router possiedono la versione corrente delle LSA dell'area." },
    "1": { routers: ["r1"], links: [], title: "R1 origina una nuova Router-LSA.", text: "Una variazione locale modifica la descrizione di R1. Sequenza e contenuto distinguono la nuova versione." },
    "2": { routers: ["r1", "r2", "r3"], links: ["12", "23"], title: "La LSA attraversa le adiacenze.", text: "R2 installa la versione più recente, la conferma e la propaga sulle interfacce ammissibili; R3 ripete il processo." },
    "3": { routers: ["r1", "r2", "r3", "r4"], links: ["12", "23", "34"], title: "Le LSDB tornano coerenti.", text: "R4 riceve la LSA e tutti i router dell'area possono rieseguire il calcolo necessario dalla propria prospettiva." }
  };

  const floodButtons = [...document.querySelectorAll("[data-flood-step]")];
  const floodRouters = [...document.querySelectorAll("[data-router]")];
  const floodLinks = [...document.querySelectorAll("[data-link]")];
  const floodTitle = document.getElementById("floodTitle");
  const floodText = document.getElementById("floodText");
  const showFlood = (key) => {
    const state = floodStates[key];
    setPressed(floodButtons, key, "floodStep");
    floodRouters.forEach((node) => node.classList.toggle("active", state.routers.includes(node.dataset.router)));
    floodLinks.forEach((link) => link.classList.toggle("active", state.links.includes(link.dataset.link)));
    floodTitle.textContent = state.title;
    floodText.textContent = state.text;
  };
  floodButtons.forEach((button) => button.addEventListener("click", () => showFlood(button.dataset.floodStep)));
  showFlood("0");

  const costButtons = [...document.querySelectorAll("[data-cost-mode]")];
  const topPath = document.querySelector('[data-path="top"]');
  const bottomPath = document.querySelector('[data-path="bottom"]');
  const r1r3Cost = document.getElementById("r1r3Cost");
  const spfTitle = document.getElementById("spfTitle");
  const spfText = document.getElementById("spfText");
  const showCost = (key) => {
    setPressed(costButtons, key, "costMode");
    const low = key === "low";
    r1r3Cost.textContent = low ? "5" : "30";
    topPath.classList.toggle("active", !low);
    bottomPath.classList.toggle("active", low);
    spfTitle.textContent = low ? "Vince R1 → R3 → rete: costo 10." : "Vince R1 → R2 → rete: costo 20.";
    spfText.textContent = low
      ? "Il percorso alternativo via R2 costa 20. OSPF propone il cammino metricamente minore; la RIB confronterà poi eventuali sorgenti diverse."
      : "Il percorso via R3 ora costa 35. La topologia non è cambiata, ma la metrica modifica l'albero SPF e il next hop candidato.";
  };
  costButtons.forEach((button) => button.addEventListener("click", () => showCost(button.dataset.costMode)));
  showCost("low");

  const troubleStates = {
    none: {
      meaning: "Nessun Hello OSPF valido è stato ricevuto dal neighbor atteso.",
      checks: "Interfaccia e line protocol; OSPF abilitato; passive-interface; Area ID; timer; autenticazione; network type; ACL o firewall; multicast sul link.",
      commands: "show ip interface brief\nshow ip ospf interface\nshow ip ospf neighbor"
    },
    init: {
      meaning: "Il router riceve Hello, ma la comunicazione bidirezionale non è confermata.",
      checks: "Direzione di ritorno; filtri asimmetrici; multicast; subnet e maschera; lista dei neighbor nel pacchetto Hello; stato sul router remoto.",
      commands: "show ip ospf neighbor\nshow ip ospf interface\nshow logging"
    },
    "2way": {
      meaning: "La comunicazione è bidirezionale; lo stato può essere corretto o incompleto.",
      checks: "Network type e ruoli DR/BDR/DROTHER. Fra DROTHER su broadcast è normale; su point-to-point o verso DR/BDR richiede diagnosi.",
      commands: "show ip ospf neighbor\nshow ip ospf interface"
    },
    exstart: {
      meaning: "La negoziazione o lo scambio Database Description non termina.",
      checks: "Maximum Transmission Unit su entrambi i lati; Router ID univoci; network type; sequenze DBD; filtri unicast e log.",
      commands: "show ip interface\nshow ip ospf neighbor\nshow ip ospf interface\nshow logging"
    },
    loading: {
      meaning: "Il router richiede LSA mancanti ma la sincronizzazione non raggiunge FULL.",
      checks: "Link State Request non soddisfatte; Link State Update; stabilità del link; filtri unicast; LSDB e log.",
      commands: "show ip ospf neighbor\nshow ip ospf database\nshow logging"
    },
    full: {
      meaning: "L'adiacenza è completa; il problema è successivo alla sincronizzazione.",
      checks: "Presenza della LSA; prefisso annunciato; area e tipo LSA; costo SPF; distanza amministrativa; route filtering; selezione RIB e programmazione FIB.",
      commands: "show ip ospf database\nshow ip route ospf\nshow ip cef\nshow logging"
    }
  };

  const troubleButtons = [...document.querySelectorAll("[data-trouble]")];
  const troubleMeaning = document.getElementById("troubleMeaning");
  const troubleChecks = document.getElementById("troubleChecks");
  const troubleCommands = document.getElementById("troubleCommands");
  const showTrouble = (key) => {
    const state = troubleStates[key];
    setPressed(troubleButtons, key, "trouble");
    troubleMeaning.textContent = state.meaning;
    troubleChecks.textContent = state.checks;
    troubleCommands.textContent = state.commands;
  };
  troubleButtons.forEach((button) => button.addEventListener("click", () => showTrouble(button.dataset.trouble)));
  showTrouble("none");
})();
