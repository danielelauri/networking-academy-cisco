(() => {
  const setPressed = (selector, selected, dataKey) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
    });
  };

  const receivers = { none: 0, b: 1, c: 1, both: 2 };

  const treeState = (rx, mode) => {
    const hasB = rx === "b" || rx === "both";
    const hasC = rx === "c" || rx === "both";
    const n = receivers[rx] ?? 0;
    const quiet = { src: 0, core: 0, b: 0, c: 0, dropB: false, dropC: false };
    if (n === 0) return quiet;
    if (mode === "uni") return { src: n, core: n, b: hasB ? 1 : 0, c: hasC ? 1 : 0, dropB: false, dropC: false };
    if (mode === "ir") return { src: 1, core: n, b: hasB ? 1 : 0, c: hasC ? 1 : 0, dropB: false, dropC: false };
    if (mode === "p12") {
      return { src: 1, core: 1, b: 1, c: 1, dropB: !hasB, dropC: !hasC };
    }
    return { src: 1, core: 1, b: hasB ? 1 : 0, c: hasC ? 1 : 0, dropB: false, dropC: false };
  };

  const summaries = {
    "none|uni": "Nessuna sede ha chiesto il flusso. Non parte nessuna copia: né unicast, né albero.",
    "none|ir": "Senza un report IGMP, PE-A non replica nulla verso il backbone. Il gruppo 239.1.1.1 non ha una lista di uscita.",
    "none|p12": "Il Profile 12 può avere già l’albero di default agganciato fra i PE. Senza ricevitori, però, il video non viene immesso: i contatori di questa figura restano a zero.",
    "none|p14": "Il Profile 14 non costruisce un ramo verso un PE senza ricevitori. Nessuna sede iscritta, nessuna copia.",
    "b|uni": "Un solo ricevitore, in sede B. L’applicazione unicast e il multicast si equivalgono: una copia dalla sorgente 10.10.10.50 fino a PE-B. La sede C non esiste per questo flusso.",
    "b|ir": "La sorgente emette un solo datagramma UDP. PE-A ne fa una copia verso PE-B, con la label di trasporto che già raggiunge 192.0.2.2. Il tratto comune porta una copia, non due.",
    "b|p12": "Profile 12: l’MDT di default comprende tutti i PE della VPN, non solo chi ha un ricevitore. PE-C riceve il flusso e lo scarta, perché in sede C nessuno ha mandato un report IGMP.",
    "b|p14": "Profile 14: l’albero è radicato in PE-A e ci entra solo un PE con ricevitori. Sede C resta fuori. Fino a P2 viaggia una sola copia, e P2 non apre il ramo verso PE-C.",
    "c|uni": "Un solo ricevitore, in sede C. Una copia unicast attraversa P1 e P2 e scende verso PE-C. Sede B non la riceve.",
    "c|ir": "PE-A replica una volta sola, verso PE-C. La label di trasporto punta alla loopback 192.0.2.3, non a 192.0.2.2. Sede B resta fuori.",
    "c|p12": "Anche se ascolta solo la sede C, il default MDT consegna una copia a PE-B. PE-B la scarta: la OIL verso CE-B è vuota. È il costo del Profile 12.",
    "c|p14": "Solo PE-C si aggancia all’albero di PE-A. Una copia fino a P2, poi il ramo verso PE-C. PE-B non vede il gruppo.",
    "both|uni": "Due ricevitori. L’applicazione, se usa unicast, emette due datagrammi UDP già sulla LAN della sorgente. PE-A—P2 ne porta due; a P2 si dividono.",
    "both|ir": "La sorgente emette un datagramma. PE-A lo duplica: sul tratto PE-A—P2 viaggiano due copie MPLS, una per ciascun PE. I router P inoltrano, non replicano.",
    "both|p12": "Entrambe le sedi sono iscritte, quindi nessuno scarta. Il default MDT porta una sola copia fino a P2 e da lì raggiunge PE-B e PE-C. Con due sedi interessate il risultato sul filo coincide col Profile 14: la differenza si vedeva quando una sede taceva.",
    "both|p14": "Entrambe le sedi sono iscritte all’albero di PE-A. Una copia sul tratto comune. P2 replica: un ramo verso PE-B, uno verso PE-C. I router P non leggono 239.1.1.1."
  };

  const paintLink = (link, count, drop) => {
    link.classList.remove("u13-on", "u13-hot", "u13-drop", "u13-off");
    if (drop) link.classList.add("u13-drop");
    else if (count > 1) link.classList.add("u13-hot");
    else if (count === 1) link.classList.add("u13-on");
    else link.classList.add("u13-off");
  };

  const paintHop = (hop, count, drop) => {
    hop.classList.remove("u13-hop-on", "u13-hop-hot", "u13-hop-drop");
    if (drop) {
      hop.textContent = "scarta";
      hop.classList.add("u13-hop-drop");
      return;
    }
    hop.textContent = count === 0 ? "—" : `×${count}`;
    if (count > 1) hop.classList.add("u13-hop-hot");
    else if (count === 1) hop.classList.add("u13-hop-on");
  };

  const root = document.getElementById("u13Tree");
  if (root) {
    const summary = document.getElementById("u13Summary");
    const boxes = {
      src: document.getElementById("u13Nsrc"),
      core: document.getElementById("u13Ncore"),
      b: document.getElementById("u13Nb"),
      c: document.getElementById("u13Nc")
    };
    let rx = "both";
    let mode = "p14";

    const show = () => {
      const state = treeState(rx, mode);
      setPressed("[data-u13-rx]", rx, "u13Rx");
      setPressed("[data-u13-mode]", mode, "u13Mode");
      paintLink(root.querySelector("[data-u13-link='src']"), state.src, false);
      paintLink(root.querySelector("[data-u13-link='core1']"), state.core, false);
      paintLink(root.querySelector("[data-u13-link='core2']"), state.core, false);
      paintLink(root.querySelector("[data-u13-link='b']"), state.b, state.dropB);
      paintLink(root.querySelector("[data-u13-link='c']"), state.c, state.dropC);
      paintLink(root.querySelector("[data-u13-link='lanb']"), state.dropB ? 0 : state.b, false);
      paintLink(root.querySelector("[data-u13-link='lanc']"), state.dropC ? 0 : state.c, false);
      paintHop(root.querySelector("[data-u13-hop='src']"), state.src, false);
      paintHop(root.querySelector("[data-u13-hop='core']"), state.core, false);
      paintHop(root.querySelector("[data-u13-hop='b']"), state.b, state.dropB);
      paintHop(root.querySelector("[data-u13-hop='c']"), state.c, state.dropC);
      root.querySelector("[data-u13-node='peb']").classList.toggle("u13-drop", state.dropB);
      root.querySelector("[data-u13-node='pec']").classList.toggle("u13-drop", state.dropC);
      const label = (count, drop) => (drop ? "1 copia, poi scarto" : count === 0 ? "nessuna" : `${count} ${count === 1 ? "copia" : "copie"}`);
      boxes.src.textContent = label(state.src, false);
      boxes.core.textContent = label(state.core, false);
      boxes.b.textContent = label(state.b, state.dropB);
      boxes.c.textContent = label(state.c, state.dropC);
      summary.textContent = summaries[`${rx}|${mode}`] || "";
    };

    document.querySelectorAll("[data-u13-rx]").forEach((button) => {
      button.addEventListener("click", () => {
        rx = button.dataset.u13Rx;
        show();
      });
    });
    document.querySelectorAll("[data-u13-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        mode = button.dataset.u13Mode;
        show();
      });
    });
    show();
  }

  const techs = {
    igmp: {
      role: "u13-role-data",
      roleText: "DOMANDA DELL’HOST · NON ATTRAVERSA IL BACKBONE",
      title: "Internet Group Management Protocol",
      lead: "IGMP è la frase con cui un host, sulla propria LAN, dice al router: «voglio il gruppo». Il Ricevitore B, 10.20.20.88, la dice a CE-B. Il Ricevitore C, 10.30.30.30, la dice a CE-C. P1 non sente questi report.",
      q: [
        ["Quale problema esisteva prima?", "Senza una domanda esplicita, l’unico modo di raggiungere «chiunque possa essere interessato» è allagare la VLAN, come un broadcast. Su una sede con pochi spettatori si copia il video anche sugli host che non lo hanno chiesto."],
        ["Che cosa risolve?", "Il Membership Report iscrive l’host. Il querier, di solito il router con l’indirizzo più basso sulla LAN, chiede periodicamente chi è ancora in ascolto. Un Leave, in IGMPv2, avvia l’uscita dal gruppo. Lo switch con IGMP snooping inoltra la trama solo verso le porte iscritte e verso la porta del router."],
        ["Che cosa non risolve?", "Non costruisce l’albero fra le sedi. Non conosce il percorso verso 10.10.10.50. Non dice a PE-A che la sede C esiste. Quello è PIM nel VRF, e poi BGP MVPN fra i PE."],
        ["Dove si colloca?", "Bordo della LAN, fra host e primo router. IGMPv2 basta per «qualsiasi sorgente verso 239.1.1.1». IGMPv3 serve se l’host nomina anche la sorgente, ed è il modo con cui si chiede un gruppo Source-Specific Multicast."],
        ["Traffico del cliente o preparazione?", "I report sono controllo, sulla LAN. Il video è un altro datagramma: UDP verso 239.1.1.1. Snooping non modifica quel datagramma; decide su quali porte della VLAN 20 o 30 esce la trama."]
      ]
    },
    rpf: {
      role: "u13-role-check",
      roleText: "CONTROLLO SUL VERSO DELLA SORGENTE",
      title: "Reverse Path Forwarding",
      lead: "L’inoltro unicast chiede: «qual è il prefisso più lungo della destinazione?». Il multicast chiede un’altra cosa: «questo datagramma, partito da 10.10.10.50, è entrato dall’interfaccia che userei per raggiungere proprio 10.10.10.50?». Se la risposta è no, si scarta.",
      q: [
        ["Quale problema esisteva prima?", "Un gruppo non è una destinazione unicast. Se ogni router replicasse ciò che riceve su tutte le altre interfacce, lo stesso video tornerebbe indietro e girerebbe. La destinazione 239.1.1.1 non indica da che parte sta la sorgente."],
        ["Che cosa risolve?", "Si consulta la rotta unicast verso la sorgente, nella tabella giusta. Nel VRF BLU quella rotta è 10.10.10.0/24, già distribuita come nell’Unità 9. L’interfaccia di quella rotta è l’unica porta di ingresso ammessa. Sull’uscita si replica solo la lista OIL, le interfacce dove qualcuno si è iscritto."],
        ["Che cosa non risolve?", "Non crea la rotta verso la sorgente. Se il ping verso 10.10.10.50 fallisce, l’RPF non ha una porta da nominare e il video non parte, anche con IGMP e PIM configurati. Il controllo è spesso silenzioso: lo stato c’è, i contatori sull’uscita non salgono."],
        ["Dove si colloca?", "Data plane, a ogni router che replica. Sul PE il controllo è nel VRF, non nella tabella globale del core. P1 fa l’RPF verso la loopback del PE radice dell’albero, non verso 10.10.10.50."],
        ["Traffico del cliente o preparazione?", "Il controllo agisce sul datagramma del video, e lo scarta oppure lo replica. La rotta usata per decidere l’aveva preparata l’unicast: OSPF nel core, MP-BGP nel VRF."]
      ]
    },
    pim: {
      role: "u13-role-tree",
      roleText: "ALBERO SOLO DOVE C’È DOMANDA",
      title: "Protocol Independent Multicast — Sparse Mode",
      lead: "PIM-SM non ha una mappa propria della rete. È indipendente dal protocollo unicast: legge la RIB che c’è già. Sparse vuol dire che i ricevitori sono pochi rispetto ai router, quindi non si allaga tutto per poi potare. Si costruisce un albero solo verso chi ha chiesto il gruppo.",
      q: [
        ["Quale problema esisteva prima?", "Il Dense Mode allaga e poi pota. Va bene se quasi ogni router ha un ricevitore. Nel backbone del Cliente Blu le sedi interessate sono due, non tutti i router P. Allagare P1 e P3 per un video chiesto in sede B e C spreca il core."],
        ["Che cosa risolve?", "Lo stato (*,G) significa «qualsiasi sorgente verso 239.1.1.1» e punta al Rendezvous Point, qui CE-B 10.20.20.1. Quando la sorgente 10.10.10.50 parte, il Designated Router della sua LAN incapsula i primi datagrammi in un Register unicast verso il RP. Poi l’ultimo hop può passare a (S,G): l’albero più corto verso 10.10.10.50, senza la sosta in sede B."],
        ["Che cosa non risolve?", "Non separa i clienti e non programma le label del core. Fra i PE, nei profili di questa unità, la segnalazione del join cliente viaggia in BGP MVPN, non come un PIM che attraversa P1. PIM resta nel VRF, sul tratto verso il CE."],
        ["Dove si colloca?", "Control plane del multicast, sopra la RIB unicast. Lo stato (10.10.10.50, 239.1.1.1) sta nella tabella multicast, con interfaccia di ingresso e OIL. Non è una rotta unicast per 239.1.1.1: quel prefisso non si installa nella RIB dell’Unità 4."],
        ["Traffico del cliente o preparazione?", "Join, Prune e Register preparano l’albero. Il video è il datagramma UDP che, a albero pronto, viene replicato. I Hello PIM verso 224.0.0.13 restano sul collegamento, con TTL 1: non sono il video."]
      ]
    },
    mvpn: {
      role: "u13-role-vpn",
      roleText: "IL GRUPPO RESTA NEL VRF",
      title: "Multicast VPN",
      lead: "La L3VPN dell’Unità 9 trasporta prefissi unicast. 239.1.1.1 non è uno di quei prefissi. La multicast VPN tiene il gruppo nel VRF BLU e, nel core, replica un tunnel del provider. P1 inoltra una label. Non impara il gruppo del cliente.",
      q: [
        ["Quale problema esisteva prima?", "Far girare PIM su ogni router P, nella tabella globale, insegnerebbe a P1 l’indirizzo 239.1.1.1 di ogni cliente. È lo stesso errore che l’Unità 9 ha già rifiutato per 10.20.20.0/24: il core BGP-free smette di esserlo."],
        ["Che cosa risolve?", "Sul PE–CE restano IGMP e PIM nel VRF. Fra i PE, BGP nell’address family MVPN porta l’auto-discovery dell’albero e il join del cliente. Il data plane nel core è un albero mLDP punto-multipunto, oppure una replica all’ingresso: una copia unicast MPLS per ogni PE che ha chiesto il flusso."],
        ["Che cosa non risolve?", "Non sostituisce la rotta unicast verso 10.10.10.50: l’RPF nel VRF la usa. Non consegna da solo il video sulla LAN: quello resta IGMP snooping sullo switch di sede. Non è il percorso del TCP 443 fra Host A e Host B."],
        ["Dove si colloca?", "Service plane sul PE, accanto alla VRF BLU. Il tunnel del provider, la Provider Multicast Service Interface, sta nel core come un albero MPLS. È overlay: sotto restano IGP e label di trasporto dell’Unità 5–7, o il SID dell’Unità 12 se il core è già Segment Routing."],
        ["Traffico del cliente o preparazione?", "Il datagramma UDP del video viaggia nel tunnel, ed è data plane. Gli annunci MVPN sono controllo, fra PE, come gli UPDATE VPNv4. Il router P vede label, non il gruppo."]
      ]
    },
    ngm: {
      role: "u13-role-vpn",
      roleText: "DUE MODI DI POTARE L’ALBERO DEL PROVIDER",
      title: "Profile 12 e Profile 14",
      lead: "Sono due profili Cisco della multicast VPN di nuova generazione. Stessa segnalazione: BGP. Stesso data plane nel core: mLDP, un albero punto-multipunto. Cambia chi è obbligato a ricevere il flusso quando solo una sede si è iscritta.",
      q: [
        ["Quale problema esisteva prima?", "Un solo albero condiviso da tutti i PE della VPN è semplice, e copia il video anche sui PE senza ricevitori. Con decine di PE la maggior parte delle copie viene scartata al bordo. È banda del core spesa per uno scarto."],
        ["Che cosa risolve?", "Il Profile 12 tiene un MDT di default: tutti i PE della VPN si agganciano, e un PE senza report scarta. Il Profile 14 partiziona per PE di ingresso: l’albero di PE-A comprende solo i PE che hanno un ricevitore per il flusso immesso da PE-A. Nella figura, con solo sede B iscritta, PE-C resta fuori."],
        ["Che cosa non risolve?", "Il Profile 14 non fa un albero per ogni gruppo. I gruppi immessi dallo stesso PE condividono quell’albero, finché non si aggiunge un albero dati separato. Non toglie PIM dal VRF e non insegna a P1 il valore 239.1.1.1."],
        ["Dove si colloca?", "Scelta di servizio sul PE, sopra mLDP e sopra l’address family MVPN. Il Profile 12 è il disegno piccolo, poche sedi. Il Profile 14 è il disegno in cui le sedi mute non devono pagare la copia. I router P eseguono l’albero in entrambi i casi."],
        ["Traffico del cliente o preparazione?", "La differenza si vede sul data plane: una copia scartata da PE-C, oppure un ramo che non nasce. L’aggancio dei PE all’albero è controllo, via BGP, prima che la sorgente emetta il primo datagramma UDP."]
      ]
    }
  };

  const techCard = document.getElementById("u13TechCard");
  if (techCard) {
    const role = document.getElementById("u13TechRole");
    const title = document.getElementById("u13TechTitle");
    const lead = document.getElementById("u13TechLead");
    const slots = [...techCard.querySelectorAll("[data-u13-q]")];
    const showTech = (id) => {
      const tech = techs[id];
      if (!tech) return;
      setPressed("[data-u13-tech]", id, "u13Tech");
      role.className = `u13-role ${tech.role}`;
      role.textContent = tech.roleText;
      title.textContent = tech.title;
      lead.textContent = tech.lead;
      slots.forEach((slot, index) => {
        const item = tech.q[index];
        slot.querySelector("b").textContent = item[0];
        slot.querySelector("p").textContent = item[1];
      });
    };
    document.querySelectorAll("[data-u13-tech]").forEach((button) => {
      button.addEventListener("click", () => showTech(button.dataset.u13Tech));
    });
    showTech("igmp");
  }
})();
