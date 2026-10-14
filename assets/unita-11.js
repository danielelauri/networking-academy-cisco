(() => {
  const setPressed = (selector, selected, dataKey) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
    });
  };

  /* Sequenza della convergenza: stato di collegamenti e nodi, tabelle di PE-A e destino del traffico.
     Le chiavi di "changed" indicano i valori diversi rispetto al fotogramma precedente. */
  const primary = { "pea-p1": "active", "p1-p2": "active", "p2-peb": "active", "pea-p3": "alt", "p3-peb": "alt" };
  const cutPrimary = { "pea-p1": "active", "p1-p2": "broken", "p2-peb": "", "pea-p3": "alt", "p3-peb": "alt" };
  const viaP3 = { "pea-p1": "dim", "p1-p2": "broken", "p2-peb": "dim", "pea-p3": "active", "p3-peb": "active" };
  const oldTables = { rib: "via 203.0.113.2 (P1) · costo 30", lfib: "push 18 → P1 · Gi0/1", vrf: "via 192.0.2.2 · label di servizio 24001" };
  const newTables = { rib: "via 203.0.113.14 (P3) · costo 40", lfib: "push 31 → P3 · Gi0/2", vrf: oldTables.vrf };

  const steps = [
    {
      clock: "prima del guasto",
      title: "1 · Stato stabile: il percorso dell’Unità 10",
      text: "Il traffico del Cliente Blu attraversa PE-A, P1, P2 e PE-B con le label 18 → 27 → pop sopra la label di servizio 24001. Il percorso via P3 esiste, ma costa 40 invece di 30 e resta inutilizzato. PE-A conosce comunque la label 31 annunciata da P3.",
      links: primary, nodes: {}, cut: false, tables: oldTables, changed: [],
      traffic: ["ok", "CONSEGNATO", "Host A → PE-A → P1 → P2 → PE-B → Host B · TTL ricevuto 58"]
    },
    {
      clock: "t = 0",
      title: "2 · La fibra fra P1 e P2 si interrompe",
      text: "Nessuna tabella è ancora cambiata. PE-A continua a imporre la label 18 e a inviare a P1; P1 continua a inoltrare verso l’interfaccia che porta a P2. Ogni pacchetto in quella direzione viene perso: è il buco nero della prima fase.",
      links: cutPrimary, nodes: {}, cut: true, tables: oldTables, changed: [],
      traffic: ["lost", "PERSO SU P1", "P1 inoltra ancora verso il collegamento guasto: nessun router se ne è accorto."]
    },
    {
      clock: "t ≈ 10 ms · fino a 40 s senza segnale di guasto",
      title: "3 · Rilevazione: P1 e P2 si accorgono del guasto",
      text: "La perdita del segnale porta giù l’interfaccia in pochi millisecondi. P1 e P2 chiudono subito l’adiacenza Open Shortest Path First (OSPF), senza attendere il Dead interval, e la sessione Label Distribution Protocol (LDP) fra loro cade. Se un apparato intermedio tenesse accesa l’interfaccia, servirebbero Bidirectional Forwarding Detection (BFD), circa 150 ms, o la scadenza del Dead interval, fino a 40 s.",
      links: cutPrimary, nodes: { p1: "detect", p2: "detect" }, cut: true, tables: oldTables, changed: [],
      traffic: ["lost", "PERSO SU P1", "P1 sa che P2 non è più raggiungibile, ma non ha ancora calcolato un’alternativa."]
    },
    {
      clock: "t ≈ 20–60 ms",
      title: "4 · Propagazione: le nuove LSA inondano il backbone",
      text: "P1 e P2 generano una nuova Router LSA, Link State Advertisement, priva del collegamento guasto, e la inondano verso tutti i vicini. In pochi millisecondi PE-A, P3 e PE-B aggiornano la propria Link State Database (LSDB). Nessun router ha ancora cambiato la propria Forwarding Information Base (FIB).",
      links: { "pea-p1": "flood", "p1-p2": "broken", "p2-peb": "flood", "pea-p3": "flood", "p3-peb": "flood" },
      nodes: { p1: "detect", p2: "detect" }, cut: true, tables: oldTables, changed: [],
      traffic: ["lost", "PERSO SU P1", "PE-A riceve la notizia, ma il data plane usa ancora la vecchia FIB."]
    },
    {
      clock: "t ≈ 50–200 ms",
      title: "5 · Calcolo SPF, router dopo router: il microloop",
      text: "Ogni router esegue Shortest Path First (SPF) per conto proprio. P1 ha finito per primo: il suo nuovo percorso verso PE-B è P1 → PE-A → P3, quindi rimanda i pacchetti a PE-A. PE-A non ha ancora aggiornato la FIB e li restituisce a P1. I pacchetti rimbalzano fra i due, perdendo un’unità di Time To Live (TTL) a ogni passaggio.",
      links: { "pea-p1": "loop", "p1-p2": "broken", "p2-peb": "", "pea-p3": "alt", "p3-peb": "alt" },
      nodes: { p1: "update", p2: "compute", pea: "compute", p3: "compute", peb: "compute" }, cut: true, tables: oldTables, changed: [],
      traffic: ["loop", "IN ANELLO FRA PE-A E P1", "Microloop: dura finché PE-A non aggiorna la FIB, o finché il TTL si esaurisce."]
    },
    {
      clock: "t ≈ 300–500 ms",
      title: "6 · PE-A aggiorna RIB, FIB e LFIB",
      text: "SPF indica a PE-A il nuovo next hop verso 192.0.2.2: P3, con costo 40. La rotta entra nella Routing Information Base (RIB); Cisco Express Forwarding (CEF) cerca nella LIB la label annunciata da P3 per quel prefisso, 31, e la programma nella Label Forwarding Information Base (LFIB) e nell’hardware. La VRF BLU non cambia: punta ancora a 192.0.2.2.",
      links: viaP3, nodes: { pea: "update" }, cut: true, tables: newTables, changed: ["rib", "lfib"],
      traffic: ["ok", "CONSEGNATO VIA P3", "Host A → PE-A → P3 → PE-B → Host B: il servizio è ripristinato."]
    },
    {
      clock: "t ≈ 1 s · nuovo stato stabile",
      title: "7 · Il nuovo percorso, dispositivo per dispositivo",
      text: "PE-A impone 24001 e sopra 31; P3 esegue Penultimate Hop Popping (PHP) e consegna a PE-B la sola 24001; PE-B torna nella VRF BLU come prima. Indipendentemente, anche PE-B ha ricalcolato il ritorno verso 192.0.2.1, che ora passa da P3. Multiprotocol BGP (MP-BGP) non ha inviato alcun UPDATE: la sua sessione ora viaggia semplicemente sul percorso nuovo.",
      links: viaP3, nodes: {}, cut: true, tables: newTables, changed: [],
      traffic: ["ok", "CONSEGNATO VIA P3", "Cinque router invece di sei: Host B riceve TTL 59 invece di 58."]
    },
    {
      clock: "minuti dopo · riparazione",
      title: "8 · Il collegamento torna: un’altra convergenza",
      text: "Riparata la fibra, OSPF ricostruisce l’adiacenza P1–P2 e la rete torna a preferire il costo 30. Se OSPF tornasse a usare il collegamento prima che LDP abbia scambiato le label, P1 non saprebbe quale label imporre verso P2. La sincronizzazione LDP–IGP, RFC 5443, annuncia il collegamento con costo massimo finché LDP non è pronto: solo allora il traffico rientra sul percorso primario.",
      links: primary, nodes: { p1: "update", p2: "update" }, cut: false, tables: oldTables, changed: ["rib", "lfib"],
      traffic: ["ok", "DI NUOVO SUL PERCORSO PRIMARIO", "Anche il ripristino è un cambio di topologia: può causare brevi microloop."]
    }
  ];

  const topo = document.getElementById("u11Topo");
  if (topo) {
    const links = [...topo.querySelectorAll("[data-u11-link]")];
    const nodes = [...topo.querySelectorAll("[data-u11-node]")];
    const prev = document.getElementById("u11Prev");
    const next = document.getElementById("u11Next");
    const out = {
      clock: document.getElementById("u11Clock"),
      title: document.getElementById("u11StepTitle"),
      text: document.getElementById("u11StepText"),
      rib: document.getElementById("u11Rib"),
      lfib: document.getElementById("u11Lfib"),
      vrf: document.getElementById("u11Vrf"),
      traffic: document.getElementById("u11Traffic"),
      trafficTitle: document.getElementById("u11TrafficTitle"),
      trafficText: document.getElementById("u11TrafficText")
    };
    const linkStates = ["active", "alt", "broken", "flood", "loop", "dim"];
    const nodeStates = ["detect", "compute", "update"];
    let current = 0;

    const showStep = (index) => {
      current = Math.max(0, Math.min(steps.length - 1, index));
      const step = steps[current];
      setPressed("[data-u11-step]", String(current), "u11Step");
      links.forEach((link) => {
        const state = step.links[link.dataset.u11Link];
        linkStates.forEach((s) => link.classList.toggle(`u11-${s}`, s === state));
      });
      nodes.forEach((node) => {
        const state = step.nodes[node.dataset.u11Node];
        nodeStates.forEach((s) => node.classList.toggle(`u11-n-${s}`, s === state));
      });
      topo.classList.toggle("u11-cut", step.cut);
      topo.setAttribute("aria-label", `${step.title}. ${step.traffic[1].toLowerCase()}: ${step.traffic[2]}`);
      out.clock.textContent = step.clock;
      out.title.textContent = step.title;
      out.text.textContent = step.text;
      ["rib", "lfib", "vrf"].forEach((key) => {
        out[key].textContent = step.tables[key];
        out[key].classList.toggle("u11-changed", step.changed.includes(key));
      });
      out.traffic.dataset.state = step.traffic[0];
      out.trafficTitle.textContent = `TRAFFICO DEL CLIENTE BLU · ${step.traffic[1]}`;
      out.trafficText.textContent = step.traffic[2];
      prev.disabled = current === 0;
      next.disabled = current === steps.length - 1;
    };

    document.querySelectorAll("[data-u11-step]").forEach((button) => {
      button.addEventListener("click", () => showStep(Number(button.dataset.u11Step)));
    });
    prev.addEventListener("click", () => showStep(current - 1));
    next.addEventListener("click", () => showStep(current + 1));
    document.querySelector(".u11-sequence").addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") { showStep(current + 1); event.preventDefault(); }
      if (event.key === "ArrowLeft") { showStep(current - 1); event.preventDefault(); }
    });
    showStep(0);
  }

  /* Guasti diversi, reazioni diverse. Ordine dei dispositivi: CE-A, PE-A, P1, P2, P3, PE-B, CE-B. */
  const faults = {
    link: {
      title: "Collegamento P1–P2 interrotto",
      text: "È il caso della sequenza. Il guasto riguarda soltanto l’underlay: cambiano i percorsi verso le loopback dei PE, non le rotte del cliente.",
      states: ["", "react", "detect", "detect", "react", "react", ""],
      detect: "P1 e P2: perdita del segnale sull’interfaccia, oppure BFD se un apparato intermedio mantiene l’interfaccia accesa.",
      react: "OSPF su tutto il backbone; LDP fornisce le label già ricevute; CEF aggiorna FIB e LFIB. PE-A riconverge l’andata, PE-B il ritorno.",
      same: "MP-BGP, VRF BLU, label di servizio 24001, routing PE–CE.",
      impact: "Un’interruzione di qualche centinaio di millisecondi con timer ottimizzati, in entrambe le direzioni; poi il percorso via P3.",
      check: "show ip ospf neighbor su P1 · show ip route 192.0.2.2 e show mpls forwarding-table 192.0.2.2 32 su PE-A"
    },
    node: {
      title: "Router P2 fuori servizio",
      text: "Si perdono insieme due collegamenti, P1–P2 e P2–PE-B. Il backbone riconverge come per il guasto di collegamento, ma a rilevarlo sono i vicini di P2.",
      states: ["", "react", "detect", "down", "react", "detect", ""],
      detect: "P1 e PE-B, che vedono cadere ciascuno il proprio collegamento verso P2.",
      react: "OSPF e LDP su PE-A, P1, P3 e PE-B; entrambe le direzioni passano da P3.",
      same: "MP-BGP e VRF BLU: le loopback 192.0.2.1 e 192.0.2.2 restano raggiungibili.",
      impact: "Interruzione simile al guasto di collegamento. Una protezione rapida deve qui proteggere il nodo: un bypass che si ricongiunge su P2 non servirebbe.",
      check: "show ip ospf neighbor su P1 e PE-B · show ip route 192.0.2.1 su PE-B"
    },
    ldp: {
      title: "Cade soltanto la sessione LDP P1–P2",
      text: "Interfaccia e adiacenza OSPF restano attive: il routing continua a preferire P1–P2. Ma P1 non ha più una label da imporre verso P2 per 192.0.2.2.",
      states: ["", "react", "detect", "detect", "react", "react", ""],
      detect: "P1 e P2 vedono cadere la sessione LDP; OSPF resta FULL e non segnala nulla.",
      react: "Senza sincronizzazione: nessuno. Con la sincronizzazione LDP–IGP, RFC 5443, P1 e P2 annunciano il collegamento con costo massimo e il backbone si sposta su P3.",
      same: "Interfacce, adiacenza OSPF, MP-BGP e VRF BLU.",
      impact: "Senza sincronizzazione: P1 rimuove le label e passa a P2 il datagramma del cliente, che P2 non sa instradare e scarta. Il guasto dura finché qualcuno non interviene.",
      check: "show mpls ldp neighbor e show mpls forwarding-table 192.0.2.2 32 su P1: uscita senza label"
    },
    pece: {
      title: "Collegamento PE-B–CE-B interrotto",
      text: "Il backbone è integro; manca l’accesso al sito B. Il guasto si propaga come informazione di servizio, non di topologia.",
      states: ["", "react", "", "", "", "detect", "detect"],
      detect: "PE-B e CE-B: interfaccia giù o scadenza della sessione di routing PE–CE.",
      react: "Routing PE–CE su PE-B; MP-BGP ritira la rotta VPNv4 65000:102:10.20.20.0/24; PE-A la rimuove dalla VRF BLU.",
      same: "OSPF, LDP e tutte le label di trasporto.",
      impact: "Il sito B è irraggiungibile finché il collegamento non torna, perché ha un solo accesso. Con un secondo collegamento verso un altro PE, la rotta di riserva sarebbe già disponibile.",
      check: "show bgp vpnv4 unicast vrf BLU 10.20.20.0 su PE-A · show ip route vrf BLU 10.20.20.0 su PE-B"
    },
    pe: {
      title: "Router PE-B fuori servizio",
      text: "Scompare il next hop BGP del servizio. Questa volta la VRF BLU di PE-A deve cambiare.",
      states: ["", "react", "react", "detect", "detect", "down", "detect"],
      detect: "P2, P3 e CE-B, che perdono il collegamento con PE-B.",
      react: "OSPF rimuove 192.0.2.2/32; su PE-A il tracciamento del next hop BGP invalida subito le rotte VPNv4 che dipendono da PE-B, senza attendere il Hold Timer.",
      same: "Il resto del backbone e i servizi degli altri siti.",
      impact: "Il sito B è irraggiungibile. Con un sito collegato a due PE, BGP Prefix Independent Convergence (PIC) commuterebbe sul PE di riserva già installato nella FIB.",
      check: "show ip route 192.0.2.2 · show bgp vpnv4 unicast all summary · show ip route vrf BLU 10.20.20.0 su PE-A"
    }
  };

  const devicesBox = document.getElementById("u11Devices");
  if (devicesBox) {
    const devices = [...devicesBox.querySelectorAll("span")];
    const names = devices.map((d) => d.textContent);
    const label = { detect: "rileva", react: "reagisce", down: "fuori servizio" };
    const f = {
      title: document.getElementById("u11FaultTitle"),
      text: document.getElementById("u11FaultText"),
      detect: document.getElementById("u11FaultDetect"),
      react: document.getElementById("u11FaultReact"),
      same: document.getElementById("u11FaultSame"),
      impact: document.getElementById("u11FaultImpact"),
      check: document.getElementById("u11FaultCheck")
    };
    const showFault = (key) => {
      const fault = faults[key];
      setPressed("[data-u11-fault]", key, "u11Fault");
      devices.forEach((device, i) => {
        ["detect", "react", "down"].forEach((s) => device.classList.toggle(`u11-d-${s}`, fault.states[i] === s));
      });
      const summary = names.map((name, i) => fault.states[i] ? `${name} ${label[fault.states[i]]}` : "").filter(Boolean).join(", ");
      devicesBox.setAttribute("aria-label", `${fault.title}: ${summary}.`);
      ["title", "text", "detect", "react", "same", "impact", "check"].forEach((k) => { f[k].textContent = fault[k]; });
    };
    document.querySelectorAll("[data-u11-fault]").forEach((button) => {
      button.addEventListener("click", () => showFault(button.dataset.u11Fault));
    });
    showFault("link");
  }

  /* Calcolatore dell'interruzione: segmenti in millisecondi, flussi in datagrammi al secondo. */
  const profiles = {
    hello: {
      title: "Solo messaggi Hello di OSPF",
      text: "Il guasto non spegne l’interfaccia, per esempio per un apparato di trasporto intermedio, e non c’è BFD: P1 se ne accorge solo allo scadere del Dead interval, 40 secondi per default.",
      segments: [["Rilevazione", 40000, "detect"], ["Propagazione e SPF", 200, "flood"], ["Aggiornamento FIB", 300, "fib"]]
    },
    phys: {
      title: "Caduta dell’interfaccia",
      text: "Fibra diretta: la perdita del segnale porta giù l’interfaccia in pochi millisecondi e OSPF reagisce subito, senza attendere il Dead interval. Eventuali ritardi configurati sull’interfaccia, come carrier-delay, si sommano alla rilevazione.",
      segments: [["Rilevazione", 10, "detect"], ["Propagazione e SPF", 200, "flood"], ["Aggiornamento FIB", 300, "fib"]]
    },
    bfd: {
      title: "BFD con tre pacchetti da 50 ms",
      text: "Lo stesso guasto non visibile del primo caso, ma Bidirectional Forwarding Detection dichiara perso il vicino dopo tre pacchetti mancanti e avvisa OSPF. La rilevazione passa da 40 secondi a 150 millisecondi.",
      segments: [["Rilevazione", 150, "detect"], ["Propagazione e SPF", 200, "flood"], ["Aggiornamento FIB", 300, "fib"]]
    },
    frr: {
      title: "Fast Reroute precalcolato",
      text: "P1 rileva il guasto e commuta subito sul percorso di riserva già installato nel data plane, per esempio con TI-LFA. La convergenza normale prosegue in background senza ulteriori perdite.",
      segments: [["Rilevazione", 10, "detect"], ["Commutazione sulla riserva", 40, "repair"]]
    }
  };
  const flows = {
    voice: { pps: 50 },
    video: { pps: 5e6 / (1500 * 8) },
    bulk: { pps: 100e6 / (1500 * 8) }
  };
  const effects = {
    voice: ["Impercettibile: al massimo un frammento audio.", "Una parola tagliata: il buco nell’audio è udibile.", "Silenzio prolungato: l’utente può chiudere la chiamata."],
    video: ["Al più un artefatto nell’immagine.", "Immagine bloccata o squadrettata per un istante.", "Video fermo: il player può dover ricaricare il buffer."],
    bulk: ["Poche ritrasmissioni TCP, rallentamento minimo.", "TCP ritrasmette e riduce la finestra: il trasferimento rallenta per qualche secondo.", "Timeout di ritrasmissione TCP: il flusso riparte lentamente e le applicazioni con timeout brevi possono chiudere la sessione."]
  };

  const bar = document.getElementById("u11Bar");
  if (bar) {
    const segs = [document.getElementById("u11SegA"), document.getElementById("u11SegB"), document.getElementById("u11SegC")];
    const c = {
      legend: document.getElementById("u11BarLegend"),
      title: document.getElementById("u11CalcTitle"),
      text: document.getElementById("u11CalcText"),
      total: document.getElementById("u11Total"),
      lost: document.getElementById("u11Lost"),
      effect: document.getElementById("u11Effect")
    };
    const nf = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
    const formatMs = (ms) => (ms >= 1000 ? `${nf.format(ms / 1000)} s` : `${nf.format(ms)} ms`);
    let profileKey = "phys";
    let flowKey = "video";

    const render = () => {
      const profile = profiles[profileKey];
      const flow = flows[flowKey];
      const total = profile.segments.reduce((sum, [, ms]) => sum + ms, 0);
      segs.forEach((seg, i) => {
        const part = profile.segments[i];
        seg.hidden = !part;
        if (!part) return;
        seg.className = `u11-seg-${part[2]}`;
        seg.style.flexGrow = String(part[1]);
        seg.textContent = `${part[0]} · ${formatMs(part[1])}`;
        seg.title = seg.textContent;
      });
      const parts = profile.segments.map(([name, ms]) => `${name} ${formatMs(ms)}`).join(" · ");
      c.legend.textContent = `${parts} · totale ${formatMs(total)}`;
      bar.setAttribute("aria-label", `${profile.title}: ${parts}.`);
      c.title.textContent = profile.title;
      c.text.textContent = profile.text;
      c.total.textContent = formatMs(total);
      c.lost.textContent = nf.format(Math.round(flow.pps * total / 1000));
      const level = total <= 60 ? 0 : total <= 1000 ? 1 : 2;
      c.effect.textContent = effects[flowKey][level];
      setPressed("[data-u11-profile]", profileKey, "u11Profile");
      setPressed("[data-u11-flow]", flowKey, "u11Flow");
    };

    document.querySelectorAll("[data-u11-profile]").forEach((button) => {
      button.addEventListener("click", () => { profileKey = button.dataset.u11Profile; render(); });
    });
    document.querySelectorAll("[data-u11-flow]").forEach((button) => {
      button.addEventListener("click", () => { flowKey = button.dataset.u11Flow; render(); });
    });
    render();
  }
})();
