    (() => {
      const fieldCopy = {
        sync: ["Preambolo e Start Frame Delimiter (SFD)", "Il preambolo aiuta il ricevente a sincronizzarsi; lo Start Frame Delimiter (SFD) segnala l'inizio della Media Access Control frame (MAC frame). Sono trasmessi dal Physical Layer (PHY) e vengono mostrati separatamente dalla dimensione calcolata da Destination Address a Frame Check Sequence (FCS)."],
        mac: ["Indirizzi MAC sorgente e destinazione", "La destinazione guida lo switch verso la porta di uscita; la sorgente permette allo switch di apprendere dove si trova il mittente. Sono indirizzi del collegamento corrente, non indirizzi end-to-end."],
        tag: ["Tag IEEE 802.1Q opzionale", "Aggiunge 4 byte dopo il Media Access Control (MAC) sorgente: Tag Protocol Identifier (TPID) e Tag Control Information (TCI). Su una porta access la trama dell'host è normalmente untagged; su un trunk il tag distingue più Virtual Local Area Network (VLAN)."],
        type: ["Campo Length/Type", "Con Ethernet II contiene un EtherType: 0x0800 IPv4, 0x86DD IPv6, 0x0806 ARP, 0x8847 MPLS. Nell'uso IEEE 802.3 può invece indicare la lunghezza del campo dati."],
        payload: ["MAC client data e padding", "Contiene la Protocol Data Unit (PDU) del livello superiore. Senza tag, il campo può trasportare normalmente fino a 1.500 byte. Se i dati sono troppo pochi, viene aggiunto padding per raggiungere la trama minima."],
        fcs: ["Frame Check Sequence (FCS)", "È un Cyclic Redundancy Check (CRC) a 32 bit calcolato sulla Media Access Control frame (MAC frame). Rileva errori accidentali sul link; una trama corrotta viene scartata, ma FCS non fornisce ritrasmissione end-to-end né autenticazione crittografica."]
      };
      const fieldButtons = [...document.querySelectorAll("[data-frame-field]")];
      const fields = [...document.querySelectorAll("[data-field-group]")];
      const fieldTitle = document.getElementById("fieldTitle");
      const fieldText = document.getElementById("fieldText");
      function setField(key) {
        fieldButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.frameField === key ? "true" : "false"));
        fields.forEach(field => field.classList.toggle("active", field.dataset.fieldGroup === key));
        fieldTitle.textContent = fieldCopy[key][0];
        fieldText.textContent = fieldCopy[key][1];
      }
      fieldButtons.forEach(button => button.addEventListener("click", () => setField(button.dataset.frameField)));

      const switchStates = [
        { title: "La Forwarding Database è vuota", text: "Lo switch non conosce ancora la posizione di 00:AA o 00:BB. Le associazioni dinamiche verranno apprese osservando gli indirizzi MAC sorgente.", rows: [], ports: [] },
        { title: "Lo switch apprende 00:AA sulla porta 1", text: "La trama entra dalla porta 1. Prima di cercare la destinazione, lo switch registra la sorgente 00:AA nella VLAN 10.", rows: [["00:AA", "10", "1"]], ports: ["1"] },
        { title: "00:BB è sconosciuto: flooding nella VLAN 10", text: "La destinazione non è nella tabella. Lo switch replica la trama sulle altre porte appartenenti alla VLAN 10; non la invia nuovamente sulla porta 1.", rows: [["00:AA", "10", "1"]], ports: ["2", "3", "4"] },
        { title: "La risposta permette di apprendere 00:BB", text: "La trama di risposta entra dalla porta 3 con sorgente 00:BB. Ora entrambe le posizioni sono conosciute.", rows: [["00:AA", "10", "1"], ["00:BB", "10", "3"]], ports: ["3", "1"] },
        { title: "La successiva trama per 00:BB è known unicast", text: "Lo switch consulta la tabella e inoltra soltanto sulla porta 3. Le altre porte non ricevono questa trama unicast.", rows: [["00:AA", "10", "1"], ["00:BB", "10", "3"]], ports: ["1", "3"] }
      ];
      const switchButtons = [...document.querySelectorAll("[data-switch-step]")];
      const portNodes = [...document.querySelectorAll("[data-port]")];
      const fdb = document.getElementById("fdb");
      const switchTitle = document.getElementById("switchTitle");
      const switchText = document.getElementById("switchText");
      function setSwitchStep(index) {
        const state = switchStates[index];
        switchButtons.forEach(button => button.setAttribute("aria-pressed", Number(button.dataset.switchStep) === index ? "true" : "false"));
        portNodes.forEach(port => port.classList.toggle("active", state.ports.includes(port.dataset.port)));
        fdb.replaceChildren();
        ["MAC", "VLAN", "PORTA"].forEach(value => { const cell = document.createElement("div"); cell.className = "fdb-head"; cell.textContent = value; fdb.appendChild(cell); });
        if (!state.rows.length) {
          [["—", "—", "—"]].forEach(row => row.forEach(value => { const cell = document.createElement("div"); cell.textContent = value; fdb.appendChild(cell); }));
        } else {
          state.rows.forEach(row => row.forEach(value => { const cell = document.createElement("div"); cell.textContent = value; fdb.appendChild(cell); }));
        }
        switchTitle.textContent = state.title;
        switchText.textContent = state.text;
      }
      switchButtons.forEach(button => button.addEventListener("click", () => setSwitchStep(Number(button.dataset.switchStep))));
      setSwitchStep(0);

      const tagModes = {
        untagged: { title: "LAN cliente senza tag", text: "La trama porta direttamente EtherType 0x0800 per IPv4. La VLAN può essere comunque associata internamente alla porta access dello switch.", parts: [["tp-mac", "MAC dst + src", "12 B"], ["tp-type", "0x0800", "IPv4"], ["tp-data", "datagramma IP", "payload"], ["tp-fcs", "FCS", "4 B"]] },
        ctag: { title: "Trunk con Customer VLAN Tag", text: "TPID 0x8100 annuncia un C-Tag; il TCI porta PCP, DEI e VID. L'EtherType del payload segue il tag.", parts: [["tp-mac", "MAC dst + src", "12 B"], ["tp-ctag", "C-Tag 0x8100", "VID 10"], ["tp-type", "0x0800", "IPv4"], ["tp-data", "datagramma IP", "payload"], ["tp-fcs", "FCS", "4 B"]] },
        qinq: { title: "Provider bridging con doppio tagging", text: "Il provider aggiunge un S-Tag esterno, tipicamente 0x88A8, e conserva il C-Tag cliente. Il dominio provider inoltra in base al proprio contesto di servizio.", parts: [["tp-mac", "MAC dst + src", "12 B"], ["tp-stag", "S-Tag 0x88A8", "S-VID 200"], ["tp-ctag", "C-Tag 0x8100", "C-VID 10"], ["tp-type", "0x0800", "IPv4"], ["tp-data", "datagramma IP", "payload"], ["tp-fcs", "FCS", "4 B"]] },
        mpls: { title: "Ethernet nel core MPLS", text: "EtherType 0x8847 indica MPLS. Il payload inizia con una o più label e continua con il datagramma cliente; gli indirizzi MAC appartengono ai router adiacenti del link provider.", parts: [["tp-mac", "MAC router", "adiacenti"], ["tp-type", "0x8847", "MPLS"], ["tp-stag", "label stack", "trasporto + servizio"], ["tp-data", "datagramma IP cliente", "payload"], ["tp-fcs", "FCS", "4 B"]] }
      };
      const tagButtons = [...document.querySelectorAll("[data-tag-mode]")];
      const tagStack = document.getElementById("tagStack");
      const tagTitle = document.getElementById("tagTitle");
      const tagText = document.getElementById("tagText");
      function setTagMode(key) {
        const state = tagModes[key];
        tagButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.tagMode === key ? "true" : "false"));
        tagStack.replaceChildren();
        state.parts.forEach(([className, label, smallText]) => { const part = document.createElement("div"); part.className = `tag-part ${className}`; part.append(document.createTextNode(label)); const small = document.createElement("small"); small.textContent = smallText; part.appendChild(small); tagStack.appendChild(part); });
        tagTitle.textContent = state.title;
        tagText.textContent = state.text;
      }
      tagButtons.forEach(button => button.addEventListener("click", () => setTagMode(button.dataset.tagMode)));
      setTagMode("untagged");

      const hopStates = {
        "lan-a": { title: "LAN del cliente A", text: "Host A invia al MAC del CE-A, il prossimo hop IP. Lo switch intermedio inoltra la trama senza trasformarsi in un endpoint della comunicazione.", parts: [["jp-mac", "MAC dst CE-A", "MAC src Host A"], ["jp-ip", "0x0800 + IPv4", "IP Host A → Host B"], ["jp-fcs", "FCS", "link locale"]] },
        access: { title: "Collegamento CE-A → PE-A", text: "CE-A ha terminato la trama della LAN. Costruisce una nuova trama con MAC del link di accesso; può aggiungere un C-Tag o un doppio tag secondo il servizio.", parts: [["jp-mac", "MAC dst PE-A", "MAC src CE-A"], ["jp-vlan", "802.1Q?", "servizio accesso"], ["jp-ip", "0x0800 + IPv4", "stesso traffico cliente"], ["jp-fcs", "nuova FCS", "nuovo link"]] },
        core: { title: "Collegamento Ethernet nel core MPLS", text: "PE-A applica le label. Fra router adiacenti il MAC è locale al link, EtherType è 0x8847 e il pacchetto labeled trasporta il datagramma cliente.", parts: [["jp-mac", "MAC dst P-next", "MAC src P-prev"], ["jp-mpls", "0x8847 + MPLS", "label stack"], ["jp-ip", "IPv4 cliente", "sotto le label"], ["jp-fcs", "FCS", "link core"]] },
        egress: { title: "Collegamento PE-B → CE-B", text: "PE-B rimuove le label e consegna il datagramma su una nuova trama del collegamento cliente. Gli indirizzi MAC del core non vengono riutilizzati.", parts: [["jp-mac", "MAC dst CE-B", "MAC src PE-B"], ["jp-vlan", "802.1Q?", "servizio accesso"], ["jp-ip", "0x0800 + IPv4", "traffico cliente"], ["jp-fcs", "nuova FCS", "nuovo link"]] },
        "lan-b": { title: "LAN del cliente B", text: "CE-B crea la trama per Host B. Il datagramma raggiunge infine l'host dentro un involucro Ethernet che esiste soltanto nella LAN B.", parts: [["jp-mac", "MAC dst Host B", "MAC src CE-B"], ["jp-ip", "0x0800 + IPv4", "IP Host A → Host B"], ["jp-fcs", "FCS", "LAN B"]] }
      };
      const hopButtons = [...document.querySelectorAll("[data-hop]")];
      const hopNodes = [...document.querySelectorAll("[data-group]")];
      const journeyFrame = document.getElementById("journeyFrame");
      const journeyCopy = document.getElementById("journeyCopy");
      function setHop(key) {
        const state = hopStates[key];
        hopButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.hop === key ? "true" : "false"));
        hopNodes.forEach(node => node.classList.toggle("active", node.dataset.group === key));
        journeyFrame.replaceChildren();
        state.parts.forEach(([className, label, smallText]) => { const part = document.createElement("div"); part.className = `journey-part ${className}`; part.append(document.createTextNode(label)); const small = document.createElement("small"); small.textContent = smallText; part.appendChild(small); journeyFrame.appendChild(part); });
        journeyCopy.innerHTML = `<strong>${state.title}.</strong> ${state.text}`;
      }
      hopButtons.forEach(button => button.addEventListener("click", () => setHop(button.dataset.hop)));
      setHop("lan-a");

      const vpnStates = {
        l3: { core: "<b>CORE L3VPN</b><p>Ethernet core + label MPLS di trasporto + label di servizio + datagramma IP cliente</p>", copy: "<strong>Il PE instrada.</strong> La trama cliente termina all'ingresso. La VRF seleziona il contesto cliente; il backbone trasporta il datagramma con label, non l'identità MAC originaria come collegamento end-to-end." },
        l2: { core: "<b>CORE L2VPN</b><p>Ethernet core + label MPLS + PDU/service instance Ethernet cliente</p>", copy: "<strong>Il PE emula un servizio Layer 2.</strong> Il contenuto Ethernet cliente può attraversare il backbone dentro un ulteriore involucro. Preambolo e FCS del link fisico cliente non sono necessariamente parte della PDU trasportata." }
      };
      const vpnButtons = [...document.querySelectorAll("[data-vpn]")];
      const vpnCore = document.getElementById("vpnCore");
      const vpnCopy = document.getElementById("vpnCopy");
      function setVpn(key) {
        vpnButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.vpn === key ? "true" : "false"));
        vpnCore.innerHTML = vpnStates[key].core;
        vpnCopy.innerHTML = vpnStates[key].copy;
      }
      vpnButtons.forEach(button => button.addEventListener("click", () => setVpn(button.dataset.vpn)));
      setVpn("l3");
    })();
