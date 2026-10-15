(() => {
  const setPressed = (selector, selected, dataKey) => {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
    });
  };

  const arches = {
    classica: {
      title: "Ossatura classica: OSPF, LDP, MP-BGP",
      underlay: "Open Shortest Path First (OSPF) disegna la mappa. PE-A raggiunge 192.0.2.2, loopback di PE-B, via P1 con costo 30. Via P3 costerebbe 40, quindi il percorso ordinario è P1–P2.",
      transport: "Label Distribution Protocol (LDP) assegna label locali. PE-A impone 18 verso P1; P1 la scambia con 27 verso P2. P2, penultimo, esegue Penultimate Hop Popping (PHP) e lascia solo la label di servizio.",
      service: "Multiprotocol Border Gateway Protocol (MP-BGP) ha già portato a PE-A la rotta 10.20.20.0/24, next hop 192.0.2.2, label di servizio 24001. I router P inoltrano la label esterna e non aprono la VRF BLU.",
      hops: ["18 + 24001", "27 + 24001", "PHP · 24001", "VRF BLU"]
    },
    srmpls: {
      title: "Stesso data plane MPLS, control plane Segment Routing",
      underlay: "Intermediate System to Intermediate System (IS-IS), oppure OSPF con le estensioni giuste, annuncia il Prefix SID di PE-B. Nello scenario l’indice 2, sommato alla base 16000, diventa la label 16002 su tutti i router.",
      transport: "PE-A impone 16002 sopra 24001. P1 non la scambia con un altro numero: anche P1 inoltra 16002. Non serve una sessione Label Distribution Protocol (LDP) per hop. P2 esegue ancora PHP.",
      service: "La riga della VRF BLU non cambia: 10.20.20.0/24 via 192.0.2.2, label 24001. Cambia solo chi ha programmato il trasporto. Il datagramma IPv4 di Host A è lo stesso dell’ossatura classica.",
      hops: ["16002 + 24001", "16002 + 24001", "PHP · 24001", "VRF BLU"]
    },
    srv6: {
      title: "Data plane IPv6: il SID è un indirizzo",
      underlay: "IS-IS annuncia il locator di PE-B, 2001:db8:b::/48. I router P lo inoltrano per longest-prefix match, con la FIB IPv6. Non hanno una Label Forwarding Information Base (LFIB) e non conoscono la VRF BLU.",
      transport: "PE-A incapsula il datagramma IPv4 del cliente in IPv6. La destinazione 2001:db8:b:0:d4:: contiene il locator di PE-B e la funzione End.DT4. Nel core non ci sono label Multiprotocol Label Switching (MPLS).",
      service: "PE-B esegue End.DT4: toglie IPv6 e consulta la VRF BLU, poi consegna a CE-B. MP-BGP continua a distribuire 10.20.20.0/24. Host B riceve il datagramma IPv4; l’involucro del provider è già sparito.",
      hops: ["IPv6 DA End.DT4", "lookup locator", "lookup locator", "End.DT4 · VRF"]
    }
  };

  const archRoot = document.getElementById("u12Arch");
  if (archRoot) {
    const title = document.getElementById("u12ArchTitle");
    const underlay = document.getElementById("u12ArchUnderlay");
    const transport = document.getElementById("u12ArchTransport");
    const service = document.getElementById("u12ArchService");
    const hops = [...archRoot.querySelectorAll("[data-u12-hop]")];

    const showArch = (id) => {
      const arch = arches[id];
      if (!arch) return;
      setPressed("[data-u12-arch]", id, "u12Arch");
      archRoot.dataset.mode = id;
      archRoot.classList.toggle("u12-arch-srv6", id === "srv6");
      title.textContent = arch.title;
      underlay.textContent = arch.underlay;
      transport.textContent = arch.transport;
      service.textContent = arch.service;
      hops.forEach((hop, index) => {
        hop.textContent = arch.hops[index];
        hop.classList.add("u12-hop-on");
      });
    };

    document.querySelectorAll("[data-u12-arch]").forEach((button) => {
      button.addEventListener("click", () => showArch(button.dataset.u12Arch));
    });
    showArch("classica");
  }

  const techs = {
    isis: {
      role: "u12-role-replace",
      roleText: "SOSTITUISCE OSPF NEL CORE, NON IL RUOLO DI IGP",
      title: "Intermediate System to Intermediate System",
      lead: "IS-IS resta un Interior Gateway Protocol (IGP) link-state. Cambia il protocollo che descrive la topologia, non il fatto che il backbone abbia bisogno di una mappa interna. Nello scenario, PE-A continua a raggiungere 192.0.2.2 via P1 con costo 30.",
      q: [
        ["Quale problema esisteva prima?", "OSPF version 2 è nato su IPv4 e ha dovuto essere esteso, area per area, per IPv6, Traffic Engineering e Segment Routing. Nei backbone molto grandi le estensioni a TLV di IS-IS sono risultate più agili."],
        ["Che cosa risolve?", "Scopre la topologia fra PE e P, calcola SPF, alimenta RIB e FIB, e può trasportare i Segment Identifier. Corre sul collegamento, non dentro un datagramma IP: un guasto IPv4 non spegne la segnalazione dell’IGP."],
        ["Che cosa non risolve?", "Non separa i clienti, non applica policy fra Autonomous System, non assegna da solo un servizio VPN. Non sostituisce BGP, MPLS o la VRF."],
        ["Dove si colloca?", "Stesso posto di OSPF: control plane dell’underlay. In un dominio se ne sceglie uno. L’unità 5 lo aveva solo accennato; qui diventa l’alternativa concreta nei Service Provider."],
        ["Traffico del cliente o preparazione?", "Prepara soltanto l’inoltro. I pacchetti Hello e LSP di IS-IS non trasportano il datagramma del Cliente Blu."]
      ]
    },
    sr: {
      role: "u12-role-replace",
      roleText: "SOSTITUISCE LDP E, SPESSO, RSVP-TE",
      title: "Segment Routing con data plane MPLS",
      lead: "Il pacchetto continua a portare label. A cambiare è chi le assegna: i Segment Identifier (SID) nascono nell’IGP, non da una sessione Label Distribution Protocol per ogni Forwarding Equivalence Class. Per il Cliente Blu, 18 e 27 diventano l’unico valore 16002; 24001 resta.",
      q: [
        ["Quale problema esisteva prima?", "LDP crea stato hop-by-hop e segue ciecamente l’IGP. RSVP-TE costruisce percorsi espliciti, ma ogni tunnel e ogni bypass Fast Reroute è stato sul core. Nell’Unità 11 l’LFA classico non copriva P1."],
        ["Che cosa risolve?", "Un Prefix SID globale, qui 16002 per PE-B, basta a programmare il trasporto. Una SR Policy o un Adjacency SID impongono un collegamento. Topology Independent LFA (TI-LFA) precalcola la riparazione anche dove l’LFA classico manca."],
        ["Che cosa non risolve?", "Non crea la VPN. Non sostituisce MP-BGP né la label di servizio 24001. Non elimina il bisogno di un IGP. Il data plane resta MPLS: push, swap, pop."],
        ["Dove si colloca?", "Control plane del trasporto, sopra l’IGP e sotto il servizio. Convivere con LDP è possibile durante la migrazione; l’obiettivo è un core senza sessioni LDP."],
        ["Traffico del cliente o preparazione?", "Le label imposte stanno nel data plane, sul pacchetto. I SID e le SR Policy si distribuiscono nel control plane, prima che il Cliente Blu invii un octet."]
      ]
    },
    evpn: {
      role: "u12-role-complete",
      roleText: "COMPLETA IL SERVICE PLANE · SOSTITUISCE VPLS",
      title: "Ethernet Virtual Private Network",
      lead: "EVPN usa Multiprotocol BGP per distribuire indirizzi MAC e, se serve, rotte IP. Il Cliente Blu dell’Unità 9 resta una Layer 3 VPN fra 10.10.10.10 e 10.20.20.77. EVPN entra quando un altro cliente chiede che due sedi sembrino la stessa LAN, non solo una coppia di reti IP.",
      q: [
        ["Quale problema esisteva prima?", "Le Layer 2 VPN basate su Virtual Private LAN Service (VPLS) allagavano i broadcast e imparavano i MAC in data plane, come uno switch grande. Poco adatto a data center e a siti con molti MAC."],
        ["Che cosa risolve?", "Il control plane BGP annuncia chi ha quale MAC. Si possono costruire LAN, linee punto-punto, e anche servizi Layer 3 con Integrated Routing and Bridging. Il core continua a inoltrare MPLS o un overlay UDP, senza imparare i MAC dei clienti."],
        ["Che cosa non risolve?", "Non sostituisce di default la L3VPN RFC 4364 del Cliente Blu. Non è un IGP. Non programma da solo le label di trasporto."],
        ["Dove si colloca?", "Service plane, accanto a MP-BGP VPNv4. Stessi ruoli PE e P: i P restano agnostici rispetto ai MAC del cliente."],
        ["Traffico del cliente o preparazione?", "Le trame Ethernet del cliente stanno nel data plane. L’annuncio MAC/IP è control plane: prepara le tabelle dei PE."]
      ]
    },
    srv6: {
      role: "u12-role-replace",
      roleText: "SOSTITUISCE IL DATA PLANE MPLS NEL CORE",
      title: "Segment Routing over IPv6",
      lead: "Il SID non è più una label a 20 bit: è un indirizzo IPv6. I router P inoltrano il locator 2001:db8:b::/48 e non tengono una LFIB. PE-B esegue End.DT4, toglie l’involucro e consegna il datagramma IPv4 alla VRF BLU, verso 10.20.20.77.",
      q: [
        ["Quale problema esisteva prima?", "MPLS richiede LFIB, PHP, e un control plane di label. Chi vuole un solo piano IPv6, o unire data center e WAN, cerca un trasporto senza etichette."],
        ["Che cosa risolve?", "Il locator IPv6 sostituisce la label di trasporto. Una funzione nel SID sostituisce, sul PE, operazioni che prima stavano nello stack MPLS. Una lista nel Segment Routing Header (SRH) può imporre un percorso, come una SR Policy."],
        ["Che cosa non risolve?", "Non elimina VRF, BGP e distinguo fra underlay e overlay. Non rende IPv4 del cliente «di colpo» IPv6: lo incapsula. MTU, hardware e operatività restano un progetto, non un accensione."],
        ["Dove si colloca?", "Data plane del backbone. Può convivere con SR-MPLS durante la migrazione. L’IGP, di solito IS-IS, continua a pubblicare locator e SID."],
        ["Traffico del cliente o preparazione?", "L’intestazione IPv6 (e l’SRH, se presente) viaggia con il pacchetto. Locator, SID e policy si preparano nel control plane."]
      ]
    },
    sdn: {
      role: "u12-role-complete",
      roleText: "COMPLETA IL CONTROLLO · NON CANCELLA I PROTOCOLLI",
      title: "Software-Defined Networking",
      lead: "L’idea è separare la decisione di percorso da ogni singolo router e concentrarla, in tutto o in parte, in un controllore. Nella pratica dei carrier convive con IGP e BGP: può dire a PE-A «il Cliente Blu eviti P1» e installare una SR Policy, senza riscrivere il backbone ogni mattina.",
      q: [
        ["Quale problema esisteva prima?", "Ogni protocollo decide in modo distribuito. Imporre un intento («questo traffico deve evitare P1») richiedeva RSVP-TE, community BGP o configurazione hop-by-hop."],
        ["Che cosa risolve?", "Un controllore vede la topologia, calcola SR Policy o percorsi espliciti, e li spinge sui PE di ingresso. L’operatore esprime un intento; i router restano il data plane."],
        ["Che cosa non risolve?", "Non sostituisce la fisica, né la necessità di un IGP di sopravvivenza se il controllore non risponde. Non è un protocollo di inoltro."],
        ["Dove si colloca?", "Control plane, spesso centralizzato o ibrido, sopra IGP e Segment Routing. Il data plane resta MPLS o IPv6."],
        ["Traffico del cliente o preparazione?", "Prepara soltanto. Il datagramma del Cliente Blu non va al controllore."]
      ]
    },
    nfv: {
      role: "u12-role-complete",
      roleText: "COMPLETA IL MODO DI EROGARE LE FUNZIONI",
      title: "Network Functions Virtualization",
      lead: "Firewall, NAT, PE virtuale e probe non devono più essere solo appliance dedicati. La funzione resta la stessa; cambia dove gira, su un server. PE-B virtuale tiene ancora la VRF BLU e consegna ancora a CE-B: Host B non vede se dietro c’è un telaio o un’istanza.",
      q: [
        ["Quale problema esisteva prima?", "Ogni funzione di servizio era un hardware da ordinare, installare e sostituire. Scalare un PE o un CGNAT voleva dire spedire un telaio."],
        ["Che cosa risolve?", "Istanza e sposta funzioni di rete su server. Utile a bordo, nei data center e per servizi che nascono e muoiono con il cliente."],
        ["Che cosa non risolve?", "Non cambia il viaggio del datagramma: serve ancora un underlay, una VRF, un next hop. Non è un sostituto di OSPF, MPLS o BGP."],
        ["Dove si colloca?", "Infrastruttura su cui girano pezzi di data plane e di service plane. Il modello CE–PE–P resta il riferimento."],
        ["Traffico del cliente o preparazione?", "Se la funzione è nel percorso (firewall, NAT), agisce sul traffico. L’orchestrazione che la accende è solo preparazione."]
      ]
    },
    ops: {
      role: "u12-role-complete",
      roleText: "COMPLETA OPERATIVITÀ E OSSERVAZIONE",
      title: "Automazione e telemetria",
      lead: "NETCONF, YANG, RESTCONF e i modelli OpenConfig descrivono lo stato desiderato come un dato, non come una sequenza di comandi digitati a mano. La telemetria in streaming affianca l’interrogazione periodica SNMP vista nell’Unità 11: i contatori arrivano di continuo, invece di una fotografia ogni pochi minuti.",
      q: [
        ["Quale problema esisteva prima?", "Configurare ventimila PE a mano, e scoprire un guasto quando il cliente chiama. SNMP e syslog restano, ma non descrivono un intento né una serie temporale densa."],
        ["Che cosa risolve?", "Dichiara la configurazione come dato, la verifica, la ripete. Esporta contatori, adiacenze e path in continuo, così la verifica operativa parte da evidenze, non da un’ipotesi."],
        ["Che cosa non risolve?", "Non inoltra pacchetti. Un modello YANG sbagliato configura in modo coerente l’errore. Serve ancora comprendere RIB, FIB, LFIB e i tre piani."],
        ["Dove si colloca?", "Piano di gestione, sopra il control plane. Si appoggia a quello che le Unità 4–11 hanno insegnato a leggere."],
        ["Traffico del cliente o preparazione?", "Prepara e osserva. Non entra nello stack del datagramma del Cliente Blu."]
      ]
    }
  };

  const techCard = document.getElementById("u12TechCard");
  if (techCard) {
    const role = document.getElementById("u12TechRole");
    const title = document.getElementById("u12TechTitle");
    const lead = document.getElementById("u12TechLead");
    const slots = [...techCard.querySelectorAll("[data-u12-q]")];

    const showTech = (id) => {
      const tech = techs[id];
      if (!tech) return;
      setPressed("[data-u12-tech]", id, "u12Tech");
      role.className = `u12-role ${tech.role}`;
      role.textContent = tech.roleText;
      title.textContent = tech.title;
      lead.textContent = tech.lead;
      slots.forEach((slot, index) => {
        const item = tech.q[index];
        slot.querySelector("b").textContent = item[0];
        slot.querySelector("p").textContent = item[1];
      });
    };

    document.querySelectorAll("[data-u12-tech]").forEach((button) => {
      button.addEventListener("click", () => showTech(button.dataset.u12Tech));
    });
    showTech("isis");
  }

  const ages = [
    {
      year: "Anni ’90",
      title: "Due IGP link-state per lo stesso mestiere",
      text: "OSPF e IS-IS rispondono allo stesso bisogno: ogni router dell’Autonomous System deve avere una mappa dei vicini e dei costi, e calcolare SPF. I Service Provider scelgono spesso IS-IS perché un’informazione nuova, per esempio un SID, entra come TLV nello stesso protocollo. Molte reti enterprise restano su OSPF. Per il Cliente Blu il risultato è lo stesso: PE-A sa che 192.0.2.2 si raggiunge via P1."
    },
    {
      year: "1998–2006",
      title: "MPLS, LDP, L3VPN: l’ossatura di questo corso",
      text: "Nascono il label switching, Label Distribution Protocol e, con RFC 4364, le VPN IP su BGP e MPLS. È l’ossatura delle Unità 6–10. L’IGP sta sotto e rende raggiungibili le loopback. Una label di trasporto attraversa i router P. MP-BGP e la VRF stanno solo sul PE. P1 inoltra il Cliente Blu senza sapere che la destinazione è 10.20.20.77."
    },
    {
      year: "2001–2010",
      title: "Traffic Engineering e protezione rapida",
      text: "Il percorso più corto non è sempre quello desiderato. RSVP-TE impone un cammino e può prenotare banda; Fast Reroute gli affianca un bypass. LFA e BFD accorciano il buco nero dell’Unità 11, ma l’LFA classico sulla topologia del Cliente Blu non c’era. Il prezzo di tunnel e bypass è stato nel core: P1 e P2 devono ricordare ogni percorso esplicito, non solo la mappa dell’IGP."
    },
    {
      year: "2013–2019",
      title: "Segment Routing e EVPN",
      text: "RFC 8402 fissa Segment Routing: il percorso è una lista di istruzioni distribuita dall’IGP, e il data plane può restare MPLS. Nello scenario 16002 sostituisce la coppia locale 18 e 27. EVPN, RFC 7432, porta i servizi Ethernet sullo stesso MP-BGP già usato per le L3VPN: i MAC si annunciano, non si imparano allagando la rete come con VPLS."
    },
    {
      year: "2018 → oggi",
      title: "SRv6, intento, telemetria",
      text: "SRv6 usa IPv6 come trasporto: P1 inoltra il locator di PE-B e non tiene una LFIB. Un controllore SDN può installare su PE-A una SR Policy, per esempio per evitare P1, senza riconfigurare ogni hop. NETCONF, YANG e la telemetria in streaming rendono ripetibile ciò che nell’Unità 11 si verificava con un comando alla volta. Il modo di leggere la rete resta quello delle unità precedenti: tre piani, CE, PE e P."
    }
  ];

  const timeOut = document.getElementById("u12TimeOut");
  if (timeOut) {
    const year = document.getElementById("u12TimeYear");
    const title = document.getElementById("u12TimeTitle");
    const text = document.getElementById("u12TimeText");
    const showAge = (index) => {
      const age = ages[index];
      if (!age) return;
      setPressed("[data-u12-time]", String(index), "u12Time");
      year.textContent = age.year;
      title.textContent = age.title;
      text.textContent = age.text;
    };
    document.querySelectorAll("[data-u12-time]").forEach((button) => {
      button.addEventListener("click", () => showAge(Number(button.dataset.u12Time)));
    });
    showAge(0);
  }
})();
