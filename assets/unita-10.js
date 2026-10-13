(() => {
  const setPressed = (selector, selected, dataKey) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
    });
  };

  /* Costruttori dei blocchi dell'unità dati. Il terzo elemento di ogni campo (1) indica
     che il valore è cambiato rispetto al fotogramma precedente. */
  const eth = (fields) => ({ cls: "eth", title: "TRAMA ETHERNET", fields });
  const label = (role, value, ttl, s, changed = []) => ({
    cls: role === "transport" ? "transport" : "service",
    title: role === "transport" ? "LABEL DI TRASPORTO" : "LABEL DI SERVIZIO",
    fields: [["Label", value, changed.includes("label")], ["TTL", ttl, changed.includes("ttl")], ["S", s, changed.includes("s")]]
  });
  const ip = (ttl, checksum, changed = false) => ({
    cls: "ip", title: "HEADER IPv4",
    fields: [["Sorgente", "10.10.10.10"], ["Destinazione", "10.20.20.77"], ["TTL", ttl, changed], ["Protocol", "6 · TCP"], ["Checksum", checksum, changed]]
  });
  const tcp = { cls: "tcp", title: "SEGMENTO TCP", fields: [["Porte", "49152 → 443"], ["Seq / Ack", "invariati"]] };
  const data = { cls: "data", title: "DATI", fields: [["Payload", "1.460 byte"]] };
  const fcs = (value, changed = true) => ({ cls: "fcs", title: "FCS", fields: [["Controllo", value, changed]] });

  const steps = [
    {
      title: "1 · Host A crea il datagramma e la prima trama",
      text: "L’applicazione consegna 1.460 byte di dati al socket TCP; Transmission Control Protocol (TCP) costruisce il segmento 49152 → 443; Internet Protocol (IP) lo incapsula nel datagramma 10.10.10.10 → 10.20.20.77 con TTL 64. La destinazione è fuori dalla subnet 10.10.10.0/24: Host A usa il gateway 10.10.10.1, il cui MAC è già noto grazie ad Address Resolution Protocol (ARP).",
      link: "Sul collegamento Host A → Switch A", size: "trama di 1.518 byte",
      layers: [eth([["MAC dst", "CE-A · Gi0/0.10"], ["MAC src", "Host A"], ["EtherType", "0x0800 · IPv4"]]), ip("64", "calcolato"), tcp, data, fcs("calcolata", false)],
      reads: ["tabella di routing dell’host: destinazione remota → gateway", "cache ARP: MAC di 10.10.10.1"],
      changes: ["crea dati, segmento, datagramma e trama", "MAC di destinazione = CE-A, non Host B"],
      ignores: ["label, VRF e MP-BGP: il provider è invisibile all’host"],
      table: "Routing dell’host: 10.20.20.77 fuori da 10.10.10.0/24 → gateway 10.10.10.1 · ARP: 10.10.10.1 → MAC CE-A",
      builtBy: "Costruita da: configurazione o DHCP, risposta ARP di CE-A."
    },
    {
      title: "2 · Switch A inoltra la trama e aggiunge il tag VLAN",
      text: "La trama entra da una porta access della VLAN 10. Lo switch apprende il MAC di Host A sulla porta d’ingresso, trova il MAC di CE-A sul trunk e inserisce il tag IEEE 802.1Q con VLAN ID 10. Poiché la trama è cambiata, ricalcola la Frame Check Sequence (FCS).",
      link: "Sul trunk Switch A → CE-A", size: "trama di 1.522 byte",
      layers: [eth([["MAC dst", "CE-A · Gi0/0.10"], ["MAC src", "Host A"], ["Tag 802.1Q", "VLAN 10 · TPID 0x8100", 1], ["EtherType", "0x0800 · IPv4"]]), ip("64", "invariato"), tcp, data, fcs("ricalcolata")],
      reads: ["MAC di destinazione, nella VLAN della porta d’ingresso", "MAC sorgente, per l’apprendimento"],
      changes: ["aggiunge il tag 802.1Q con VLAN 10", "ricalcola la FCS"],
      ignores: ["header IP: TTL e checksum invariati", "segmento TCP e dati"],
      table: "Tabella MAC della VLAN 10: MAC CE-A → porta trunk Gi0/24",
      builtBy: "Costruita da: apprendimento automatico degli indirizzi sorgente."
    },
    {
      title: "3 · CE-A instrada il datagramma verso il provider",
      text: "CE-A riceve la trama sulla subinterfaccia Gi0/0.10, riconosce il proprio MAC, rimuove tag e intestazione Ethernet ed esamina il datagramma. 10.20.20.77 corrisponde alla rotta 10.20.20.0/24 verso 172.16.1.2, cioè PE-A. CE-A decrementa il TTL, ricalcola il checksum e costruisce una trama nuova sul collegamento verso il provider.",
      link: "Sul collegamento CE-A → PE-A", size: "trama di 1.518 byte",
      layers: [eth([["MAC dst", "PE-A · Gi0/0", 1], ["MAC src", "CE-A · Gi0/1", 1], ["EtherType", "0x0800 · IPv4"]]), ip("63", "ricalcolato", true), tcp, data, fcs("nuova")],
      reads: ["MAC di destinazione e VLAN 10, per scegliere la subinterfaccia", "IP di destinazione: longest-prefix match", "cache ARP: MAC di 172.16.1.2"],
      changes: ["TTL 64 → 63 e checksum IP", "nuova trama CE-A → PE-A, senza tag"],
      ignores: ["porte TCP e dati", "nessuna label: CE-A non partecipa a MPLS"],
      table: "FIB di CE-A: 10.20.20.0/24 → 172.16.1.2 via Gi0/1 · ARP: 172.16.1.2 → MAC PE-A",
      builtBy: "Costruita da: protocollo PE–CE o rotta statica, ARP."
    },
    {
      title: "4 · PE-A: lookup nella VRF BLU e due push",
      text: "La trama arriva su Gi0/0, associata alla Virtual Routing and Forwarding (VRF) BLU. PE-A rimuove l’intestazione Ethernet e cerca 10.20.20.77 nella FIB della VRF BLU: la rotta importata da MP-BGP indica il next hop 192.0.2.2 e la label di servizio 24001. La risoluzione del next hop nella tabella globale indica P1 e la label di trasporto 18. PE-A decrementa il TTL IP, impone 24001 con bit S = 1, poi sopra 18, e usa EtherType 0x8847.",
      link: "Sul collegamento PE-A → P1", size: "trama di 1.526 byte",
      layers: [eth([["MAC dst", "P1 · 203.0.113.2", 1], ["MAC src", "PE-A · Gi0/1", 1], ["EtherType", "0x8847 · MPLS", 1]]), label("transport", "18", "62", "0", ["label", "ttl", "s"]), label("service", "24001", "62", "1", ["label", "ttl", "s"]), ip("62", "ricalcolato", true), tcp, data, fcs("nuova")],
      reads: ["interfaccia d’ingresso → VRF BLU", "IP di destinazione nella FIB della VRF BLU", "next hop BGP 192.0.2.2 nella tabella globale"],
      changes: ["TTL IP 63 → 62, copiato nelle label", "push 24001 (S = 1), poi push 18", "nuova trama verso P1 con EtherType 0x8847"],
      ignores: ["indirizzi IP e porte TCP del cliente", "Route Distinguisher e Route Target: restano nel control plane"],
      table: "FIB VRF BLU: 10.20.20.0/24 → via 192.0.2.2, label 24001 · tabella globale: 192.0.2.2/32 → 203.0.113.2, label 18",
      builtBy: "Costruita da: MP-BGP (rotta VPNv4 con RT 65000:100), OSPF (loopback di PE-B), LDP (label 18)."
    },
    {
      title: "5 · P1 scambia la label superiore",
      text: "Dall’EtherType 0x8847 P1 sa che dopo l’intestazione Ethernet c’è uno stack MPLS. Legge soltanto la label superiore 18: la Label Forwarding Information Base (LFIB) indica swap con 27 verso P2. Decrementa il TTL della label. La label 24001 e il datagramma cliente restano sotto, presenti ma non interpretati.",
      link: "Sul collegamento P1 → P2", size: "trama di 1.526 byte",
      layers: [eth([["MAC dst", "P2 · 203.0.113.6", 1], ["MAC src", "P1 · 203.0.113.5", 1], ["EtherType", "0x8847 · MPLS"]]), label("transport", "27", "61", "0", ["label", "ttl"]), label("service", "24001", "62", "1"), ip("62", "invariato"), tcp, data, fcs("nuova")],
      reads: ["EtherType 0x8847", "label superiore 18 nella LFIB"],
      changes: ["swap 18 → 27, TTL della label 62 → 61", "nuova trama verso P2"],
      ignores: ["label di servizio 24001", "header IP: il TTL resta 62", "nessuna rotta del Cliente Blu"],
      table: "LFIB di P1: in 18 → out 27, verso P2 (203.0.113.6)",
      builtBy: "Costruita da: LDP, che segue il percorso OSPF verso 192.0.2.2."
    },
    {
      title: "6 · P2 rimuove la label di trasporto (PHP)",
      text: "Per la label 27 la LFIB di P2 indica pop: PE-B ha annunciato implicit null per la propria loopback, chiedendo Penultimate Hop Popping (PHP). P2 rimuove la label esterna e, nel modello uniform, copia il TTL decrementato, 60, nella label 24001, che diventa la superiore. L’EtherType resta 0x8847 perché nello stack rimane una label.",
      link: "Sul collegamento P2 → PE-B", size: "trama di 1.522 byte",
      layers: [eth([["MAC dst", "PE-B · 203.0.113.10", 1], ["MAC src", "P2 · 203.0.113.9", 1], ["EtherType", "0x8847 · MPLS"]]), label("service", "24001", "60", "1", ["ttl"]), ip("62", "invariato"), tcp, data, fcs("nuova")],
      reads: ["label superiore 27 nella LFIB"],
      changes: ["pop di 27: 24001 diventa la label superiore", "TTL 60 copiato nella label di servizio", "nuova trama verso PE-B"],
      ignores: ["significato della label 24001", "header IP e segmento TCP"],
      table: "LFIB di P2: in 27 → pop (implicit null), verso PE-B (203.0.113.10)",
      builtBy: "Costruita da: LDP; PE-B ha annunciato implicit null per 192.0.2.2/32."
    },
    {
      title: "7 · PE-B usa la label di servizio e torna nel contesto del cliente",
      text: "PE-B riceve la label 24001, che ha allocato e annunciato esso stesso. La LFIB associa la label all’uscita della VRF BLU: PE-B rimuove la label e scrive nel datagramma il TTL 59. Con una label per prefisso inoltra direttamente verso CE-B; con una label per VRF eseguirebbe prima un lookup IP nella VRF BLU. La trama verso il cliente torna a usare EtherType 0x0800.",
      link: "Sul collegamento PE-B → CE-B", size: "trama di 1.518 byte",
      layers: [eth([["MAC dst", "CE-B · Gi0/1", 1], ["MAC src", "PE-B · Gi0/1", 1], ["EtherType", "0x0800 · IPv4", 1]]), ip("59", "ricalcolato", true), tcp, data, fcs("nuova")],
      reads: ["label 24001 nella LFIB", "lookup nella VRF BLU, solo se la label è per VRF"],
      changes: ["pop di 24001: lo stack è vuoto", "TTL IP 59 e checksum", "nuova trama verso CE-B con EtherType 0x0800"],
      ignores: ["indirizzi IP e porte TCP", "nessuna label raggiunge il cliente"],
      table: "LFIB di PE-B: in 24001 → pop, uscita VRF BLU verso 172.16.2.1 (CE-B)",
      builtBy: "Costruita da: allocazione locale di PE-B e rotta 10.20.20.0/24 appresa da CE-B; il binding è stato annunciato a PE-A con MP-BGP."
    },
    {
      title: "8 · CE-B consegna nella rete del sito B",
      text: "CE-B esamina il datagramma: 10.20.20.77 appartiene alla rete connessa 10.20.20.0/24 sulla subinterfaccia Gi0/0.20. Decrementa il TTL, ricalcola il checksum e usa la cache ARP per il MAC di Host B. Sul trunk verso Switch B la trama porta il tag della VLAN 20.",
      link: "Sul trunk CE-B → Switch B", size: "trama di 1.522 byte",
      layers: [eth([["MAC dst", "Host B", 1], ["MAC src", "CE-B · Gi0/0.20", 1], ["Tag 802.1Q", "VLAN 20 · TPID 0x8100", 1], ["EtherType", "0x0800 · IPv4"]]), ip("58", "ricalcolato", true), tcp, data, fcs("nuova")],
      reads: ["IP di destinazione: rete connessa", "cache ARP: MAC di 10.20.20.77"],
      changes: ["TTL 59 → 58 e checksum", "nuova trama verso Host B con tag VLAN 20"],
      ignores: ["porte TCP e dati"],
      table: "FIB di CE-B: 10.20.20.0/24 connessa su Gi0/0.20 · ARP: 10.20.20.77 → MAC Host B",
      builtBy: "Costruita da: configurazione dell’interfaccia, ARP."
    },
    {
      title: "9 · Switch B rimuove il tag e consegna alla porta di Host B",
      text: "Switch B riceve la trama sul trunk, la associa alla VLAN 20 grazie al tag e trova il MAC di Host B su una porta access. Prima di trasmetterla rimuove il tag IEEE 802.1Q e ricalcola la FCS.",
      link: "Sul collegamento Switch B → Host B", size: "trama di 1.518 byte",
      layers: [eth([["MAC dst", "Host B"], ["MAC src", "CE-B · Gi0/0.20"], ["EtherType", "0x0800 · IPv4"]]), ip("58", "invariato"), tcp, data, fcs("ricalcolata")],
      reads: ["tag VLAN 20", "MAC di destinazione nella tabella della VLAN 20"],
      changes: ["rimuove il tag 802.1Q", "ricalcola la FCS"],
      ignores: ["header IP: il TTL resta 58", "segmento TCP e dati"],
      table: "Tabella MAC della VLAN 20: MAC Host B → porta access Gi0/5",
      builtBy: "Costruita da: apprendimento automatico degli indirizzi sorgente."
    },
    {
      title: "10 · Host B riceve, verifica e consegna i dati",
      text: "Host B accetta la trama perché il MAC di destinazione è il proprio e la FCS è corretta. L’header IP indica la destinazione 10.20.20.77 e Protocol 6; TCP usa porte e numero di sequenza per consegnare i 1.460 byte al socket in ascolto sulla porta 443. Il TTL ricevuto, 58, racconta i sei router attraversati.",
      link: "Ricevuto da Host B", size: "1.460 byte all’applicazione",
      layers: [eth([["MAC dst", "Host B"], ["MAC src", "CE-B · Gi0/0.20"], ["EtherType", "0x0800 · IPv4"]]), ip("58", "verificato"), tcp, data, fcs("verificata", false)],
      reads: ["MAC di destinazione e FCS", "IP di destinazione e Protocol 6", "porte TCP, sequenza e conferma"],
      changes: ["rimuove trama, header IP e segmento: all’applicazione arrivano solo i dati", "TCP prepara la conferma (ACK)"],
      ignores: ["nessuna traccia di label, VRF o rotte VPN"],
      table: "Socket TCP: 10.20.20.77:443 ↔ 10.10.10.10:49152, connessione stabilita",
      builtBy: "Costruita da: applicazione server e apertura della connessione TCP."
    }
  ];

  const path = document.getElementById("u10Path");
  const nodes = [...path.querySelectorAll("[data-u10-node]")];
  const packet = document.getElementById("u10Packet");
  const prev = document.getElementById("u10Prev");
  const next = document.getElementById("u10Next");
  const out = {
    title: document.getElementById("u10StepTitle"),
    text: document.getElementById("u10StepText"),
    link: document.getElementById("u10LinkLabel"),
    size: document.getElementById("u10FrameSize"),
    reads: document.getElementById("u10Reads"),
    changes: document.getElementById("u10Changes"),
    ignores: document.getElementById("u10Ignores"),
    table: document.getElementById("u10Table"),
    builtBy: document.getElementById("u10BuiltBy")
  };
  let current = 0;

  const fillList = (list, items) => {
    list.replaceChildren(...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));
  };

  const renderPacket = (step) => {
    const blocks = step.layers.map((layer) => {
      const block = document.createElement("div");
      block.className = `u10-layer u10-l-${layer.cls}`;
      const title = document.createElement("b");
      title.textContent = layer.title;
      const dl = document.createElement("dl");
      layer.fields.forEach(([name, value, changed]) => {
        const row = document.createElement("div");
        if (changed) row.className = "u10-changed";
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = name;
        dd.textContent = value;
        row.append(dt, dd);
        dl.append(row);
      });
      block.append(title, dl);
      return block;
    });
    packet.replaceChildren(...blocks);
    const summary = step.layers.map((layer) => layer.title.toLowerCase()).join(", ");
    packet.setAttribute("aria-label", `${step.link}: ${summary}.`);
  };

  const showStep = (index, fromUser = false) => {
    current = Math.max(0, Math.min(steps.length - 1, index));
    const step = steps[current];
    setPressed("[data-u10-step]", String(current), "u10Step");
    nodes.forEach((node, i) => {
      node.classList.toggle("u10-active", i === current);
      node.classList.toggle("u10-done", i < current);
    });
    out.title.textContent = step.title;
    out.text.textContent = step.text;
    out.link.textContent = step.link;
    out.size.textContent = step.size;
    fillList(out.reads, step.reads);
    fillList(out.changes, step.changes);
    fillList(out.ignores, step.ignores);
    out.table.textContent = step.table;
    out.builtBy.textContent = step.builtBy;
    renderPacket(step);
    prev.disabled = current === 0;
    next.disabled = current === steps.length - 1;
    if (fromUser) nodes[current].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  };

  document.querySelectorAll("[data-u10-step]").forEach((button) => {
    button.addEventListener("click", () => showStep(Number(button.dataset.u10Step), true));
  });
  nodes.forEach((node) => node.addEventListener("click", () => showStep(Number(node.dataset.u10Node), true)));
  prev.addEventListener("click", () => showStep(current - 1, true));
  next.addEventListener("click", () => showStep(current + 1, true));
  document.querySelector(".u10-journey").addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { showStep(current + 1, true); event.preventDefault(); }
    if (event.key === "ArrowLeft") { showStep(current - 1, true); event.preventDefault(); }
  });
  showStep(0);

  /* Control plane sopra, data plane sotto: che cosa prepara ogni protocollo e che cosa accade se manca. */
  const planes = document.getElementById("u10Planes");
  const devices = [...planes.querySelectorAll(".u10-dev")];
  const proto = {
    title: document.getElementById("u10ProtoTitle"),
    text: document.getElementById("u10ProtoText"),
    prepares: document.getElementById("u10ProtoPrepares"),
    steps: document.getElementById("u10ProtoSteps"),
    fail: document.getElementById("u10ProtoFail")
  };
  const protocols = {
    arp: {
      title: "ARP · Address Resolution Protocol",
      text: "Su ogni collegamento Ethernet risolve l’indirizzo IP del vicino nel suo indirizzo MAC. Le risposte valgono soltanto su quel link: ARP non attraversa i router.",
      prepares: "Il MAC di destinazione di ogni trama: CE-A per Host A, PE-A per CE-A, P1 per PE-A e così via fino a Host B.",
      steps: "1 · 3 · 4 · 5 · 6 · 7 · 8",
      fail: "Il dispositivo conosce il next hop IP ma non può costruire la trama: l’adiacenza resta incompleta e il datagramma viene scartato o attende la risoluzione.",
      involved: [0, 2, 3, 4, 5, 6, 7, 9],
      aria: "ARP opera su ogni collegamento Ethernet fra dispositivi IP, dal sito A al sito B."
    },
    pece: {
      title: "Routing PE–CE",
      text: "Rotte statiche o un protocollo come External Border Gateway Protocol (eBGP) o OSPF fra Customer Edge e Provider Edge. Collega il routing del cliente alla VRF del provider.",
      prepares: "Su CE-A la rotta 10.20.20.0/24 verso PE-A; su PE-B la rotta 10.20.20.0/24 nella VRF BLU verso CE-B, che PE-B trasforma in VPNv4.",
      steps: "3 · 7",
      fail: "Senza la rotta su PE-B non nasce alcuna rotta VPNv4 da annunciare; senza la rotta su CE-A il datagramma non entra nemmeno nel provider.",
      involved: [2, 3, 6, 7],
      aria: "Il routing PE–CE opera fra CE-A e PE-A e fra PE-B e CE-B."
    },
    ospf: {
      title: "OSPF · Open Shortest Path First",
      text: "È l’Interior Gateway Protocol (IGP) del provider: calcola i percorsi interni e rende raggiungibili le loopback 192.0.2.1 e 192.0.2.2.",
      prepares: "La rotta globale 192.0.2.2/32 su PE-A, P1 e P2; la base dei percorsi che LDP seguirà.",
      steps: "4 · 5 · 6",
      fail: "Il next hop BGP 192.0.2.2 non è risolvibile: la rotta VPNv4 non viene usata e la VRF BLU di PE-A non ha un’uscita valida. Anche LDP resta senza percorsi da seguire.",
      involved: [3, 4, 5, 6],
      aria: "OSPF opera fra PE-A, P1, P2 e PE-B."
    },
    ldp: {
      title: "LDP · Label Distribution Protocol",
      text: "Distribuisce i binding delle label di trasporto per la Forwarding Equivalence Class (FEC) 192.0.2.2/32, a ritroso da PE-B verso PE-A.",
      prepares: "La label 18 usata da PE-A, lo swap 18 → 27 su P1 e il pop su P2 grazie all’implicit null di PE-B.",
      steps: "4 · 5 · 6",
      fail: "PE-A conosce la rotta VPN ma non ha una label di trasporto verso 192.0.2.2: i router P non possono inoltrare un pacchetto che porta soltanto la label di servizio, che per loro non ha significato.",
      involved: [3, 4, 5, 6],
      aria: "LDP opera fra PE-A, P1, P2 e PE-B."
    },
    mpbgp: {
      title: "MP-BGP · Multiprotocol Border Gateway Protocol",
      text: "Sessione fra i Provider Edge, diretta o tramite Route Reflector. I router P non partecipano: il core resta BGP-free.",
      prepares: "La rotta VPNv4 65000:102:10.20.20.0/24 con RT 65000:100, next hop 192.0.2.2 e label di servizio 24001, importata nella VRF BLU di PE-A.",
      steps: "4 · 7",
      fail: "La VRF BLU di PE-A non contiene 10.20.20.0/24: CE-A consegna ancora il datagramma, ma PE-A non trova una rotta e lo scarta, salvo una rotta di default nella VRF.",
      involved: [3, 6],
      aria: "MP-BGP opera soltanto fra PE-A e PE-B; i router P non partecipano."
    }
  };
  const showProto = (key) => {
    const state = protocols[key];
    setPressed("[data-u10-proto]", key, "u10Proto");
    planes.dataset.proto = key;
    planes.setAttribute("aria-label", state.aria);
    devices.forEach((device, i) => device.classList.toggle("u10-involved", state.involved.includes(i)));
    proto.title.textContent = state.title;
    proto.text.textContent = state.text;
    proto.prepares.textContent = state.prepares;
    proto.steps.textContent = state.steps;
    proto.fail.textContent = state.fail;
  };
  document.querySelectorAll("[data-u10-proto]").forEach((button) => {
    button.addEventListener("click", () => showProto(button.dataset.u10Proto));
  });
  showProto("ospf");
})();
