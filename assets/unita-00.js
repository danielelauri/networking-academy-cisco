    (() => {
      const encapExplanations = [
        {
          title: "1 · Dati applicativi",
          text: "È l'informazione che l'utente vuole realmente trasferire. Tutto ciò che verrà aggiunto serve a consegnarla e interpretarla correttamente."
        },
        {
          title: "2 · Transmission Control Protocol",
          text: "TCP aggiunge porte, numeri di sequenza e informazioni di controllo. La nuova unità prende il nome di segmento TCP."
        },
        {
          title: "3 · Internet Protocol",
          text: "IP aggiunge gli indirizzi logici sorgente e destinazione. Il segmento TCP diventa il payload di un datagramma IP."
        },
        {
          title: "4 · Multiprotocol Label Switching",
          text: "All'ingresso di un dominio MPLS possono essere aggiunte una o più label. Non sono presenti necessariamente in ogni rete o lungo l'intero percorso."
        },
        {
          title: "5 · Ethernet",
          text: "Ethernet aggiunge le informazioni per il collegamento locale e una Frame Check Sequence. La trama è l'involucro effettivamente trasmesso sul link Ethernet."
        }
      ];

      const encapButtons = [...document.querySelectorAll("[data-encap-step]")];
      const encapRows = [...document.querySelectorAll("[data-encap-row]")];
      const encapTitle = document.getElementById("encapTitle");
      const encapText = document.getElementById("encapText");

      function setEncapStep(index) {
        encapButtons.forEach((button, buttonIndex) => {
          button.setAttribute("aria-pressed", buttonIndex === index ? "true" : "false");
        });
        encapRows.forEach((row, rowIndex) => {
          row.classList.toggle("is-active", rowIndex === index);
        });
        encapTitle.textContent = encapExplanations[index].title;
        encapText.textContent = encapExplanations[index].text;
      }

      encapButtons.forEach((button) => {
        button.addEventListener("click", () => setEncapStep(Number(button.dataset.encapStep)));
      });

      const journeyStates = {
        "lan-a": {
          detail: "<strong>LAN del cliente A.</strong> Il datagramma IP è trasportato in una trama Ethernet diretta al prossimo hop. Non possiede ancora label MPLS.",
          parts: [
            ["part-eth", "ETHERNET", "header locale"],
            ["part-ip", "IP", "end-to-end"],
            ["part-tcp", "TCP", "trasporto"],
            ["part-data", "DATI", "payload"],
            ["part-fcs", "FCS", "controllo"]
          ]
        },
        ingress: {
          detail: "<strong>Provider Edge di ingresso.</strong> Il PE termina la trama ricevuta, effettua il lookup del servizio e applica le label MPLS prima di creare la trama del collegamento verso il core.",
          parts: [
            ["part-eth", "ETHERNET", "link provider"],
            ["part-mpls", "MPLS ×2", "trasporto + VPN"],
            ["part-ip", "IP", "cliente"],
            ["part-tcp", "TCP", "trasporto"],
            ["part-data", "DATI", "payload"],
            ["part-fcs", "FCS", "controllo"]
          ]
        },
        core: {
          detail: "<strong>Core MPLS.</strong> I router P inoltrano usando la label superiore. La label di trasporto può essere sostituita; il datagramma del cliente non deve essere analizzato dai router core per scegliere il servizio VPN.",
          parts: [
            ["part-eth", "ETHERNET", "nuovo link"],
            ["part-mpls", "MPLS ×2", "swap label esterna"],
            ["part-ip", "IP", "cliente"],
            ["part-tcp", "TCP", "trasporto"],
            ["part-data", "DATI", "payload"],
            ["part-fcs", "FCS", "controllo"]
          ]
        },
        egress: {
          detail: "<strong>Provider Edge di uscita.</strong> Le label vengono rimosse. La label di servizio aiuta il PE a individuare la VRF corretta e quindi l'uscita verso il cliente.",
          parts: [
            ["part-ip", "IP", "cliente"],
            ["part-tcp", "TCP", "trasporto"],
            ["part-data", "DATI", "payload"]
          ]
        },
        "lan-b": {
          detail: "<strong>LAN del cliente B.</strong> Il datagramma IP viene inserito in una nuova trama Ethernet per la consegna locale. Le label MPLS non esistono più.",
          parts: [
            ["part-eth", "ETHERNET", "header locale"],
            ["part-ip", "IP", "end-to-end"],
            ["part-tcp", "TCP", "trasporto"],
            ["part-data", "DATI", "payload"],
            ["part-fcs", "FCS", "controllo"]
          ]
        }
      };

      const journeyButtons = [...document.querySelectorAll("[data-journey-step]")];
      const journeyNodes = [...document.querySelectorAll("[data-node-group]")];
      const journeyPacket = document.getElementById("journeyPacket");
      const journeyDetail = document.getElementById("journeyDetail");

      function setJourneyStep(key) {
        const state = journeyStates[key];
        journeyButtons.forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.journeyStep === key ? "true" : "false");
        });
        journeyNodes.forEach((node) => {
          node.classList.toggle("is-active", node.dataset.nodeGroup === key);
        });
        journeyPacket.replaceChildren();
        state.parts.forEach(([className, label, sublabel]) => {
          const part = document.createElement("div");
          part.className = `packet-part ${className}`;
          part.append(document.createTextNode(label));
          const small = document.createElement("small");
          small.textContent = sublabel;
          part.appendChild(small);
          journeyPacket.appendChild(part);
        });
        journeyDetail.innerHTML = state.detail;
      }

      journeyButtons.forEach((button) => {
        button.addEventListener("click", () => setJourneyStep(button.dataset.journeyStep));
      });

      setJourneyStep("lan-a");
    })();
