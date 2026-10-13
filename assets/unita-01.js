    (() => {
      const headerCopy = {
        ports: {
          title: "Porte sorgente e destinazione",
          text: "Permettono al sistema operativo di associare il segmento ai processi corretti. La porta sorgente è spesso effimera; la destinazione può essere una porta nota del servizio, ma il numero da solo non descrive l'intera connessione."
        },
        sequence: {
          title: "Sequence Number e Acknowledgment Number",
          text: "Ogni byte occupa logicamente una posizione nel flusso, ma non porta un numero separato. Sequence Number (SEQ) indica la posizione del primo byte del payload del segmento; con il flag Acknowledgment (ACK), Acknowledgment Number indica il prossimo byte atteso e conferma cumulativamente le posizioni precedenti."
        },
        control: {
          title: "Data Offset, flag, Window e opzioni",
          text: "Data Offset indica la lunghezza dell'header. Flag come Synchronize (SYN), Acknowledgment (ACK), Finish (FIN) e Reset (RST) controllano la connessione. Window annuncia la capacità del ricevitore; le opzioni possono includere Maximum Segment Size (MSS), Window Scale e timestamp."
        },
        check: {
          title: "Checksum TCP",
          text: "Protegge header e dati TCP includendo anche uno pseudo-header derivato da Internet Protocol. Rileva corruzioni accidentali, ma non offre autenticazione crittografica contro un attaccante."
        }
      };

      const headerButtons = [...document.querySelectorAll("[data-header]")];
      const headerTitle = document.getElementById("headerTitle");
      const headerText = document.getElementById("headerText");
      headerButtons.forEach((button) => {
        button.addEventListener("click", () => {
          headerButtons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
          const copy = headerCopy[button.dataset.header];
          headerTitle.textContent = copy.title;
          headerText.textContent = copy.text;
        });
      });

      const fileSize = 4000;
      const mssRange = document.getElementById("mssRange");
      const mssValue = document.getElementById("mssValue");
      const segmentCount = document.getElementById("segmentCount");
      const segmentTrack = document.getElementById("segmentTrack");
      const segmentTitle = document.getElementById("segmentTitle");
      const segmentText = document.getElementById("segmentText");
      const number = new Intl.NumberFormat("it-IT");

      function renderSegments() {
        const mss = Number(mssRange.value);
        const count = Math.ceil(fileSize / mss);
        const payloads = [];
        let remaining = fileSize;
        while (remaining > 0) {
          const payload = Math.min(mss, remaining);
          payloads.push(payload);
          remaining -= payload;
        }
        mssValue.textContent = number.format(mss);
        segmentCount.textContent = `${count} segment${count === 1 ? "o" : "i"} TCP`;
        segmentTrack.replaceChildren();
        payloads.forEach((payload, index) => {
          const box = document.createElement("div");
          box.className = "segment-box";
          const label = document.createElement("b");
          label.textContent = `Segmento ${index + 1}`;
          const value = document.createElement("span");
          value.textContent = `${number.format(payload)} byte dati`;
          const total = document.createElement("small");
          total.textContent = `IP totale ${number.format(payload + 40)} B`;
          box.append(label, value, total);
          segmentTrack.appendChild(box);
        });
        const ipSizes = payloads.map((payload) => number.format(payload + 40)).join(" + ");
        segmentTitle.textContent = `Con Maximum Segment Size (MSS) ${number.format(mss)}: ${count} segment${count === 1 ? "o" : "i"}`;
        segmentText.textContent = `I payload sono ${payloads.map((payload) => number.format(payload)).join(" + ")} byte. Aggiungendo 20 byte TCP e 20 byte IPv4, i datagrammi IP misurano ${ipSizes} byte.`;
      }

      mssRange.addEventListener("input", renderSegments);
      renderSegments();

      const sequenceCopy = [
        ["Il primo segmento trasporta i byte 1–1.460", "Il sequence number identifica il primo byte del payload contenuto nel segmento."],
        ["Il ricevitore risponde Acknowledgment (ACK) 1.461", "Il riscontro conferma cumulativamente i primi 1.460 byte e indica il prossimo byte atteso."],
        ["Il secondo segmento si perde", "La rete non consegna il segmento. TCP conserva dati non confermati e usa i propri segnali di perdita; i router non inviano un ACK TCP."],
        ["TCP ritrasmette gli stessi byte", "Il mittente invia nuovamente i byte a partire dal Sequence Number (SEQ) 1.461. Una ritrasmissione non crea nuovi dati nel flusso."],
        ["Acknowledgment (ACK) 2.921 conferma 2.920 byte", "Il ricevitore ha ora una sequenza continua fino al byte 2.920 e chiede il byte successivo, 2.921."]
      ];
      const sequenceButtons = [...document.querySelectorAll("[data-seq-step]")];
      const messages = [...document.querySelectorAll("[data-message]")];
      const sequenceTitle = document.getElementById("sequenceTitle");
      const sequenceText = document.getElementById("sequenceText");

      function setSequenceStep(index) {
        sequenceButtons.forEach((button) => button.setAttribute("aria-pressed", Number(button.dataset.seqStep) === index ? "true" : "false"));
        messages.forEach((message) => message.classList.toggle("active", Number(message.dataset.message) <= index));
        sequenceTitle.textContent = sequenceCopy[index][0];
        sequenceText.textContent = sequenceCopy[index][1];
      }

      sequenceButtons.forEach((button) => button.addEventListener("click", () => setSequenceStep(Number(button.dataset.seqStep))));
      setSequenceStep(0);
    })();
