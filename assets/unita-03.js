    (() => {
      const fieldCopy = {
        format: ["Version, Internet Header Length e opzioni", "Version vale 4. IHL indica la lunghezza dell'header in parole da 32 bit: 5 significa 20 byte; il massimo 15 significa 60 byte. Le opzioni sono facoltative e il padding allinea l'header a 32 bit."],
        service: ["Differentiated Services e Explicit Congestion Notification", "DSCP può indicare il comportamento per-hop desiderato; ECN permette di segnalare congestione senza scarto quando tutti i componenti coinvolti lo supportano. Una marcatura non è da sola una garanzia di qualità."],
        length: ["Total Length", "Misura in byte l'intero datagramma IPv4: header più payload. Il campo è lungo 16 bit, quindi il valore massimo rappresentabile è 65.535 byte."],
        fragment: ["Identification, Flags e Fragment Offset", "Identification associa i frammenti dello stesso datagramma; Don't Fragment (DF) proibisce la frammentazione e More Fragments (MF) segnala che seguono altri frammenti. Fragment Offset esprime la posizione dei dati in unità da 8 byte."],
        forward: ["Time To Live (TTL), Protocol e Header Checksum", "Il router riduce il Time To Live (TTL) e scarta il datagramma quando il limite è esaurito. Protocol identifica il contenuto superiore. Header Checksum verifica soltanto l'header IPv4 e deve riflettere il TTL aggiornato."],
        address: ["Indirizzi sorgente e destinazione", "Sono indirizzi logici a 32 bit. Un router ordinario li usa per l'inoltro ma non li sostituisce a ogni hop; traduzioni, tunnel e policy speciali sono eccezioni esplicite, non il comportamento base di IP."],
        payload: ["Payload del livello superiore", "Può contenere, per esempio, un segmento TCP, un datagramma UDP, un messaggio ICMP o un pacchetto OSPF. Il campo Protocol dice al destinatario come interpretarne l'inizio."]
      };
      const fieldButtons = [...document.querySelectorAll("[data-ip-field]")];
      const fields = [...document.querySelectorAll("[data-field-group]")];
      const fieldTitle = document.getElementById("fieldTitle");
      const fieldText = document.getElementById("fieldText");
      function setField(key) {
        fieldButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.ipField === key ? "true" : "false"));
        fields.forEach((field) => field.classList.toggle("active", field.dataset.fieldGroup === key));
        fieldTitle.textContent = fieldCopy[key][0];
        fieldText.textContent = fieldCopy[key][1];
      }
      fieldButtons.forEach((button) => button.addEventListener("click", () => setField(button.dataset.ipField)));

      const destinationStates = {
        local: { network: "192.0.2.0/24", binary: "AND fra 192.0.2.77 e la maschera /24 → 192.0.2.0", result: "<strong>Stessa rete: consegna diretta.</strong> Host A mantiene 192.0.2.77 come destinazione IP e usa Address Resolution Protocol per conoscere il MAC di 192.0.2.77." },
        remote: { network: "198.51.100.0/24", binary: "AND fra 198.51.100.23 e la maschera /24 → 198.51.100.0", result: "<strong>Rete differente: consegna indiretta.</strong> Il datagramma conserva IP destinazione 198.51.100.23; Host A usa Address Resolution Protocol per conoscere il MAC del gateway 192.0.2.1." },
        gateway: { network: "192.0.2.0/24", binary: "AND fra 192.0.2.1 e la maschera /24 → 192.0.2.0", result: "<strong>Il gateway stesso è on-link.</strong> Host A può raggiungere direttamente 192.0.2.1 sul collegamento e risolverne il MAC. Il suo ruolo di gateway riguarda poi le destinazioni remote." }
      };
      const destinationButtons = [...document.querySelectorAll("[data-destination]")];
      const destinationNetwork = document.getElementById("destinationNetwork");
      const destinationBinary = document.getElementById("destinationBinary");
      const decisionResult = document.getElementById("decisionResult");
      function setDestination(key) {
        const state = destinationStates[key];
        destinationButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.destination === key ? "true" : "false"));
        destinationNetwork.textContent = state.network;
        destinationBinary.textContent = state.binary;
        decisionResult.innerHTML = state.result;
      }
      destinationButtons.forEach((button) => button.addEventListener("click", () => setDestination(button.dataset.destination)));

      const hopStates = {
        "a-r1": { mac: "MAC Host A → MAC R1", ttl: "64", title: "Primo collegamento: Host A → R1", text: "Host A determina che la destinazione è remota e invia la trama al MAC del gateway. R1 riceverà il datagramma con TTL 64.", nodes: [0, 1] },
        "r1-r2": { mac: "MAC R1 → MAC R2", ttl: "63", title: "Secondo collegamento: R1 → R2", text: "R1 rimuove la prima trama, riduce TTL da 64 a 63, aggiorna Header Checksum e crea una nuova trama destinata a R2.", nodes: [1, 2] },
        "r2-r3": { mac: "MAC R2 → MAC R3", ttl: "62", title: "Terzo collegamento: R2 → R3", text: "R2 ripete il processo: il datagramma conserva gli endpoint IP, mentre TTL e checksum cambiano e la coppia MAC appartiene al nuovo link.", nodes: [2, 3] },
        "r3-b": { mac: "MAC R3 → MAC Host B", ttl: "61", title: "Ultimo collegamento: R3 → Host B", text: "R3 riconosce la rete di Host B come direttamente connessa, risolve il MAC finale e consegna il datagramma in una nuova trama locale.", nodes: [3, 4] }
      };
      const hopButtons = [...document.querySelectorAll("[data-hop]")];
      const hopNodes = [...document.querySelectorAll("[data-hop-node]")];
      const hopMac = document.getElementById("hopMac");
      const hopTtl = document.getElementById("hopTtl");
      const hopTitle = document.getElementById("hopTitle");
      const hopText = document.getElementById("hopText");
      function setHop(key) {
        const state = hopStates[key];
        hopButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.hop === key ? "true" : "false"));
        hopNodes.forEach((node, index) => node.classList.toggle("active", state.nodes.includes(index)));
        hopMac.textContent = state.mac;
        hopTtl.textContent = state.ttl;
        hopTitle.textContent = state.title;
        hopText.textContent = state.text;
      }
      hopButtons.forEach((button) => button.addEventListener("click", () => setHop(button.dataset.hop)));

      const routes = [
        { prefix: "10.20.30.0/24", length: 24, nextHop: "R-C", iface: "Gi0/3", match: (ip) => ip.startsWith("10.20.30.") },
        { prefix: "10.20.0.0/16", length: 16, nextHop: "R-B", iface: "Gi0/2", match: (ip) => ip.startsWith("10.20.") },
        { prefix: "10.0.0.0/8", length: 8, nextHop: "R-A", iface: "Gi0/1", match: (ip) => ip.startsWith("10.") },
        { prefix: "0.0.0.0/0", length: 0, nextHop: "R-DEFAULT", iface: "Gi0/0", match: () => true }
      ];
      const routeButtons = [...document.querySelectorAll("[data-route-destination]")];
      const routeTable = document.getElementById("routeTable");
      const routeStatus = document.getElementById("routeStatus");
      function setRouteDestination(ip) {
        routeButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.routeDestination === ip ? "true" : "false"));
        const matching = routes.filter((route) => route.match(ip));
        const winner = matching.reduce((best, route) => route.length > best.length ? route : best, matching[0]);
        routeTable.replaceChildren();
        ["Prefisso", "Lunghezza", "Next hop", "Interfaccia"].forEach((label) => {
          const cell = document.createElement("div");
          cell.className = "route-cell head";
          cell.textContent = label;
          routeTable.appendChild(cell);
        });
        routes.forEach((route) => {
          [route.prefix, `/${route.length}`, route.nextHop, route.iface].forEach((value) => {
            const cell = document.createElement("div");
            cell.className = "route-cell";
            if (matching.includes(route)) cell.classList.add("match");
            if (route === winner) cell.classList.add("winner");
            cell.textContent = value;
            routeTable.appendChild(cell);
          });
        });
        const alternatives = matching.filter((route) => route !== winner).map((route) => route.prefix).join(", ");
        routeStatus.innerHTML = `<strong>Risultato per ${ip}: ${winner.prefix}.</strong> ${alternatives ? `Corrispondono anche ${alternatives}, ma /${winner.length} è il prefisso più lungo` : "È l'unico prefisso corrispondente"}: uscita verso ${winner.nextHop} su ${winner.iface}.`;
      }
      routeButtons.forEach((button) => button.addEventListener("click", () => setRouteDestination(button.dataset.routeDestination)));
      setRouteDestination("10.20.30.44");

      const fragmentButtons = [...document.querySelectorAll("[data-fragment-mode]")];
      const fragmentOutput = document.getElementById("fragmentOutput");
      const fragmentTitle = document.getElementById("fragmentTitle");
      const fragmentText = document.getElementById("fragmentText");
      function fragmentRow(label, header, data, width) {
        const row = document.createElement("div");
        row.className = "fragment-row";
        const rowLabel = document.createElement("b");
        rowLabel.textContent = label;
        const bar = document.createElement("div");
        bar.className = "fragment-bar";
        const headerPart = document.createElement("span");
        headerPart.className = "header";
        headerPart.textContent = header;
        const dataPart = document.createElement("span");
        dataPart.className = "data";
        dataPart.style.width = `${width}%`;
        dataPart.textContent = data;
        bar.append(headerPart, dataPart);
        row.append(rowLabel, bar);
        return row;
      }
      function setFragmentMode(mode) {
        fragmentButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.fragmentMode === mode ? "true" : "false"));
        fragmentOutput.replaceChildren();
        if (mode === "allow") {
          fragmentOutput.append(
            fragmentRow("Frammento 1", "IPv4 20 B", "1.256 B · offset 0 · MF 1", 82),
            fragmentRow("Frammento 2", "IPv4 20 B", "224 B · offset 157 · MF 0", 26)
          );
          fragmentTitle.textContent = "Il router produce due frammenti.";
          fragmentText.textContent = "Il primo porta 1.256 byte di dati, multiplo di 8; il secondo porta i 224 byte rimanenti. Ogni frammento riceve un proprio header, conserva Identification e usa More Fragments (MF) e Fragment Offset per il riassemblaggio finale.";
        } else {
          const row = document.createElement("div");
          row.className = "fragment-row";
          const rowLabel = document.createElement("b");
          rowLabel.textContent = "Esito";
          const bar = document.createElement("div");
          bar.className = "fragment-bar";
          const notice = document.createElement("span");
          notice.className = "notice";
          notice.textContent = "SCARTO · Internet Control Message Protocol (ICMP) fragmentation needed · next-hop Maximum Transmission Unit (MTU) 1.280";
          bar.appendChild(notice);
          row.append(rowLabel, bar);
          fragmentOutput.appendChild(row);
          fragmentTitle.textContent = "Il router non può frammentare.";
          fragmentText.textContent = "Con Don't Fragment (DF) impostato, il datagramma troppo grande viene scartato. Il messaggio Internet Control Message Protocol (ICMP) consente alla sorgente di apprendere la Maximum Transmission Unit (MTU) del next hop e ridurre la dimensione dei datagrammi successivi.";
        }
      }
      fragmentButtons.forEach((button) => button.addEventListener("click", () => setFragmentMode(button.dataset.fragmentMode)));
      setFragmentMode("allow");
    })();
