import PDFDocument from 'pdfkit';

const CANAL = '#124453';
const GOLD = '#C5A059';
const MUTED = '#4A5560';
const INK = '#1D1D1F';
const RULE = '#E5E5EA';
const BOX = '#F4F7F9';

/** Full guest guides. fr/de/es fall back to English for completeness. */
const GUIDE = {
  en: {
    title: 'Venice Guest Guide',
    subtitle: 'Hotel Canal · Santa Croce 553 · Concierge notes',
    intro:
      'A practical guide from reception: how to move around Venice, reach the main sights and the lagoon islands, and enjoy the city without stress.',
    sections: [
      {
        heading: '1. Getting around',
        blocks: [
          {
            title: 'Vaporetto (ACTV water bus)',
            paras: [
              'This is the public transport network for the canals and islands. Buy tickets in the official AVM / ACTV app, at Hellovenezia machines, or at ticket offices near major stops (Piazzale Roma, Ferrovia, San Zaccaria, Fondamente Nove).',
              'Single ticket (75 minutes): useful for one ride. Tourist travel cards (24 / 48 / 72 hours): better value if you take several boats in a day. Validate paper tickets at the stop before boarding and keep them for inspectors.',
              'Important lines from our area: Line 1 (slow scenic ride along the Grand Canal to Rialto and San Marco), Line 2 (faster Grand Canal / Giudecca links), Lines 4.1 / 4.2 (Murano and circular routes), Line 12 (to Burano / Torcello from Fondamente Nove or via Murano).',
            ],
          },
          {
            title: 'From Hotel Canal (Santa Croce)',
            paras: [
              'You are close to Piazzale Roma and the railway (Ferrovia). Many city sights are walkable. For islands, walk or take a short hop to Piazzale Roma / Ferrovia / Fondamente Nove and board the vaporetto.',
              'Walking is often the nicest way for Rialto and San Polo. Wear comfortable shoes: bridges, uneven stone and occasional acqua alta puddles are part of Venice.',
              'Water taxi: door-to-door and fast, but expensive. Gondola: a beautiful experience, not practical transport. Traghetti (gondola ferries across the Grand Canal) are cheap if you only need to cross.',
            ],
          },
          {
            title: 'Tickets & practical notes',
            paras: [
              'Children, luggage and airport links have special rules: ask reception if you need Marco Polo (Alilaguna / bus) or Treviso advice.',
              'Boats can be crowded 10:00–17:00. Standing on open decks is fine; mind your bags on boarding. Last boats to the islands leave earlier than you think — check return times before you go.',
            ],
          },
        ],
      },
      {
        heading: '2. San Marco',
        blocks: [
          {
            title: 'What to see',
            paras: [
              'Piazza San Marco, Basilica di San Marco, Campanile, Doge\'s Palace (Palazzo Ducale), the Clock Tower and the waterfront toward San Giorgio Maggiore. This is the ceremonial heart of Venice.',
              'Inside the Basilica: mosaics and the Pala d\'Oro (timed slots may apply). The Campanile terrace has the classic panorama. The Doge\'s Palace museum and Bridge of Sighs are worth a booked visit if you like history.',
            ],
          },
          {
            title: 'How to get there',
            paras: [
              'On foot: about 25–40 minutes from Santa Croce via Rialto / Mercerie, depending on pace and crowds. Follow yellow signs to “San Marco”.',
              'By vaporetto: Line 1 or 2 toward San Marco Vallaresso / San Zaccaria. Line 1 is slower and more scenic along the Grand Canal.',
              'Best time: early morning (before 9:30) or after 18:00. Midday in high season is the busiest. Security checks at the Basilica mean short queues — arrive with shoulders covered.',
            ],
          },
        ],
      },
      {
        heading: '3. Rialto',
        blocks: [
          {
            title: 'What to see & do',
            paras: [
              'The Rialto Bridge is the oldest crossing of the Grand Canal. On the San Polo side you find the Rialto Market (pescheria and erberia): fish, fruit and vegetables — best before late morning.',
              'Around the bridge: bacari for cicchetti, views from both banks, and lively shopping streets. A short walk west takes you into quieter San Polo and toward Santa Croce (your hotel side).',
            ],
          },
          {
            title: 'How to get there',
            paras: [
              'On foot from Hotel Canal: roughly 15–25 minutes through Santa Croce / San Polo. Pleasant and usually faster than waiting for a boat.',
              'By vaporetto: Line 1 to Rialto. Useful if you are tired or carrying shopping.',
              'Tip: cross the bridge once for the view, then explore the market lanes rather than staying only on the tourist strip.',
            ],
          },
        ],
      },
      {
        heading: '4. Casino di Venezia',
        blocks: [
          {
            title: 'What it is',
            paras: [
              'The historic Casino di Venezia is housed in Ca\' Vendramin Calergi on the Grand Canal in Cannaregio — one of Europe\'s famous gaming houses, also known as the palace where Richard Wagner died.',
              'Evening rooms usually require smarter dress (no sportswear / flip-flops). Bring a passport or ID. Opening hours and table games vary — check the official site or ask reception the same day.',
            ],
          },
          {
            title: 'How to get there',
            paras: [
              'Vaporetto Line 1 to San Marcuola, then a short walk along the waterfront to Ca\' Vendramin.',
              'From Santa Croce you can also walk via Strada Nova (longer, about 35–45 minutes) if you enjoy Cannaregio\'s quieter streets and bacari.',
            ],
          },
        ],
      },
      {
        heading: '5. Murano',
        blocks: [
          {
            title: 'What to see & do',
            paras: [
              'Murano is the glass island: furnaces (fornaci), showrooms, the Glass Museum (Museo del Vetro), and the Basilica dei Santi Maria e Donato with its beautiful floor.',
              'Watch a glassmaking demonstration in a legitimate furnace. Buy from shops with clear prices; be polite but firm with street hawkers who steer you into commission-based showrooms.',
              'Allow 2–3 hours for a first visit. Combine with Burano only if you start in the morning.',
            ],
          },
          {
            title: 'How to get there',
            paras: [
              'From Piazzale Roma / Ferrovia: Lines 3 (direct, limited), 4.1 or 4.2 toward Murano. From Fondamente Nove: frequent boats to Murano.',
              'Get off at Murano Museo or Murano Faro depending on your plan. Walking between stops on the island is easy and pleasant.',
              'Return: same lines back to Venice. Keep an eye on the last useful boat if you stay for dinner.',
            ],
          },
        ],
      },
      {
        heading: '6. Burano',
        blocks: [
          {
            title: 'What to see & do',
            paras: [
              'Burano is famous for brightly painted houses, lace tradition, and a relaxed village feel. Photograph the canals, visit the Lace Museum if open, and enjoy a seafood lunch.',
              'Neighbouring Torcello (short boat hop) has the ancient cathedral and a peaceful atmosphere — excellent if you want a quieter afternoon.',
              'Half a day is ideal. Full day if you pair Murano + Burano + Torcello with an early start.',
            ],
          },
          {
            title: 'How to get there',
            paras: [
              'Line 12 from Fondamente Nove to Burano (also stops at Murano on some runs — confirm the board). From Murano you can continue on Line 12 toward Burano.',
              'From Santa Croce: vaporetto or walk to Fondamente Nove / Ferrovia, then Line 12. Journey time to Burano is roughly 40–45 minutes from Fondamente Nove.',
              'Boats are less frequent late afternoon. Check the return timetable before lunch so you are not rushed.',
            ],
          },
        ],
      },
      {
        heading: '7. What to see & do (city)',
        blocks: [
          {
            title: 'Ideas near the hotel',
            paras: [
              'Wander Santa Croce and San Polo in the early morning: fewer crowds, beautiful light, local bakeries.',
              'Sunset from Ponte dell\'Accademia or along the Zattere (Giudecca Canal). San Giorgio Maggiore (boat from San Zaccaria) for a calmer view back to the Bacino.',
              'Cicchetti and a spritz in a bacaro — try smaller places off the main tourist lanes in Dorsoduro, San Polo or Cannaregio.',
              'Gallerie dell\'Accademia or the Peggy Guggenheim Collection if you want art. Ca\' Rezzonico for an 18th-century palace atmosphere.',
            ],
          },
          {
            title: 'Dining tip from Hotel Canal',
            paras: [
              'Our partner restaurant Trattoria alla Terrazza is about a five-minute walk from the hotel (see the walking steps in your welcome email). Book for dinner in high season. Guests with the welcome voucher should show the QR before ordering.',
            ],
          },
        ],
      },
      {
        heading: '8. Practical tips',
        blocks: [
          {
            title: 'Comfort & etiquette',
            paras: [
              'Comfortable shoes are essential. Carry a light layer — evenings on the water can be cooler. In churches, cover shoulders and avoid loud phone calls.',
              'Drinking fountains with the “vera da pozzo” often provide potable water; refill a bottle. Public toilets may require a small fee at major hubs.',
              'Pickpockets work crowded boats and bridges: keep zippers closed. Never buy “tickets” from individuals on the street.',
              'Acqua alta: if forecast, reception can advise routes and temporary walkways. Pack a compact umbrella in changeable weather.',
            ],
          },
        ],
      },
    ],
    footer:
      'Hotel Canal · Santa Croce 553, Venice · Ask reception for live timetables, tickets and reservations',
  },
  it: {
    title: 'Guida ospite Venezia',
    subtitle: 'Hotel Canal · Santa Croce 553 · Note concierge',
    intro:
      'Guida pratica dalla reception: come muoversi, raggiungere i luoghi principali e le isole, e godersi la città senza stress.',
    sections: [
      {
        heading: '1. Come muoversi',
        blocks: [
          {
            title: 'Vaporetto (ACTV)',
            paras: [
              'E\' il trasporto pubblico di canali e isole. Biglietti dall\'app ufficiale AVM/ACTV, dalle macchinette Hellovenezia o alle biglietterie (Piazzale Roma, Ferrovia, San Zaccaria, Fondamente Nove).',
              'Corsa singola (75 minuti) per un tratto; tessere 24/48/72 ore se fate piu\' corse. Obliterate i biglietti cartacei alla fermata prima di salire e teneteli con voi.',
              'Linee utili: Linea 1 (Gran Canal panoramico verso Rialto e San Marco), Linea 2 (piu\' veloce), Linee 4.1/4.2 (Murano), Linea 12 (Burano/Torcello da Fondamente Nove o via Murano).',
            ],
          },
          {
            title: 'Dall\'Hotel Canal (Santa Croce)',
            paras: [
              'Siete vicini a Piazzale Roma e Ferrovia. Molti punti si fanno a piedi; per le isole usate il vaporetto da Piazzale Roma / Ferrovia / Fondamente Nove.',
              'Per Rialto e San Polo spesso conviene camminare. Scarpe comode: ponti, pietra irregolare e eventuali pozze di acqua alta.',
              'Water taxi: veloce ma costoso. Gondola: esperienza, non trasporto. Traghetti: economici per solo attraversare il Canal Grande.',
            ],
          },
          {
            title: 'Biglietti e note pratiche',
            paras: [
              'Per aeroporto (Marco Polo / Treviso) chiedete in reception: Alilaguna, bus o taxi.',
              'Le barche sono piu\' affollate tra le 10 e le 17. Controllate sempre l\'orario di ritorno dalle isole.',
            ],
          },
        ],
      },
      {
        heading: '2. San Marco',
        blocks: [
          {
            title: 'Cosa vedere',
            paras: [
              'Piazza, Basilica, Campanile, Palazzo Ducale, Torre dell\'Orologio e la riva verso San Giorgio. Cuore cerimoniale di Venezia.',
              'In Basilica: mosaici e Pala d\'Oro (possibili slot orari). Dal Campanile panorama classico. Palazzo Ducale e Ponte dei Sospiri meritano visita prenotata.',
            ],
          },
          {
            title: 'Come arrivare',
            paras: [
              'A piedi: 25–40 minuti da Santa Croce via Rialto / Mercerie. Seguite le frecce gialle “San Marco”.',
              'In vaporetto: Linea 1 o 2 per San Marco Vallaresso / San Zaccaria. La 1 e\' piu\' lenta e scenografica.',
              'Meglio al mattino presto o dopo le 18. In Basilica spalle coperte; possibili controlli di sicurezza.',
            ],
          },
        ],
      },
      {
        heading: '3. Rialto',
        blocks: [
          {
            title: 'Cosa vedere e fare',
            paras: [
              'Il Ponte di Rialto e\' il piu\' antico sul Canal Grande. Sul lato San Polo: mercato (pescheria ed erberia), meglio entro tarda mattinata.',
              'Intorno: bacari, viste sul canale, shopping. Verso ovest San Polo piu\' tranquillo e ritorno verso Santa Croce.',
            ],
          },
          {
            title: 'Come arrivare',
            paras: [
              'A piedi dall\'hotel: circa 15–25 minuti. Spesso piu\' rapido della barca.',
              'In vaporetto: Linea 1 fermata Rialto.',
              'Consiglio: attraversate il ponte per la vista, poi esplorate le calli del mercato oltre la striscia piu\' turistica.',
            ],
          },
        ],
      },
      {
        heading: '4. Casinò di Venezia',
        blocks: [
          {
            title: 'Cos\'e\'',
            paras: [
              'Il Casinò storico e\' a Ca\' Vendramin Calergi in Cannaregio, sul Canal Grande. Palazzo celebre anche per Wagner.',
              'Di sera abbigliamento curato. Porta documento. Orari e giochi variano: chiedete in reception lo stesso giorno.',
            ],
          },
          {
            title: 'Come arrivare',
            paras: [
              'Vaporetto Linea 1 a San Marcuola, poi breve camminata sulla riva.',
              'In alternativa a piedi via Strada Nova (35–45 minuti) se volete attraversare Cannaregio.',
            ],
          },
        ],
      },
      {
        heading: '5. Murano',
        blocks: [
          {
            title: 'Cosa vedere e fare',
            paras: [
              'Isola del vetro: fornaci, vetrine, Museo del Vetro, Basilica dei Santi Maria e Donato.',
              'Assistete a una dimostrazione in fornace seria. Evitate accompagnatori insistenti in calle.',
              'Prevedete 2–3 ore. Abbinate Burano solo partendo la mattina.',
            ],
          },
          {
            title: 'Come arrivare',
            paras: [
              'Da Piazzale Roma / Ferrovia: Linee 3, 4.1 o 4.2. Da Fondamente Nove: corse frequenti.',
              'Fermate utili: Murano Museo o Murano Faro. L\'isola si percorre bene a piedi.',
              'Ritorno sulle stesse linee; controllate l\'ultima corsa utile.',
            ],
          },
        ],
      },
      {
        heading: '6. Burano',
        blocks: [
          {
            title: 'Cosa vedere e fare',
            paras: [
              'Case colorate, tradizione dei merletti, atmosfera di paese. Museo del Merletto se aperto; pranzo di pesce consigliato.',
              'Vicino Torcello (breve traghetto): cattedrale antica e silenzio. Ideale per un pomeriggio piu\' quieto.',
              'Mezza giornata tipica; giornata intera se Murano + Burano + Torcello con partenza presto.',
            ],
          },
          {
            title: 'Come arrivare',
            paras: [
              'Linea 12 da Fondamente Nove a Burano (verificate se ferma a Murano). Da Murano potete proseguire con la 12.',
              'Da Santa Croce: verso Fondamente Nove / Ferrovia poi Linea 12 (~40–45 minuti da Fondamente Nove).',
              'Nel pomeriggio le corse diradano: controllate il ritorno prima di pranzo.',
            ],
          },
        ],
      },
      {
        heading: '7. Cosa vedere e fare in citta\'',
        blocks: [
          {
            title: 'Idee vicino all\'hotel',
            paras: [
              'Passeggiata mattutina in Santa Croce e San Polo: meno folla, luce bella, panifici.',
              'Tramonto dal Ponte dell\'Accademia o lungo le Zattere. San Giorgio Maggiore per la vista sul Bacino.',
              'Cicchetti e spritz in bacaro fuori dalle calli piu\' affollate (Dorsoduro, San Polo, Cannaregio).',
              'Accademia o Peggy Guggenheim per l\'arte; Ca\' Rezzonico per un palazzo del Settecento.',
            ],
          },
          {
            title: 'Cena dall\'Hotel Canal',
            paras: [
              'La Trattoria alla Terrazza e\' a circa cinque minuti a piedi (indicazioni nella mail di benvenuto). In alta stagione prenotate. Con il voucher mostrate il QR prima di ordinare.',
            ],
          },
        ],
      },
      {
        heading: '8. Consigli pratici',
        blocks: [
          {
            title: 'Comfort e galateo',
            paras: [
              'Scarpe comode. Porta uno strato leggero per la sera sull\'acqua. In chiesa spalle coperte.',
              'Fontanelle spesso potabili: riempite una bottiglia. Toilette pubbliche a pagamento nei nodi principali.',
              'Attenzione ai borseggiatori su barche e ponti. Non comprate biglietti da privati in strada.',
              'Acqua alta: in reception vi indichiamo percorsi e passerelle. Ombrello compatto utile.',
            ],
          },
        ],
      },
    ],
    footer:
      'Hotel Canal · Santa Croce 553, Venezia · In reception per orari aggiornati, biglietti e prenotazioni',
  },
};

function resolveGuideLang(raw) {
  const code = String(raw || '')
    .trim()
    .slice(0, 2)
    .toLowerCase();
  if (code === 'it') return 'it';
  return 'en';
}

export function buildVeniceGuidePdfBuffer(lang = 'en') {
  const copy = GUIDE[resolveGuideLang(lang)];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 56, left: 48, right: 48 },
      info: {
        Title: copy.title,
        Author: 'Hotel Canal',
        Subject: 'Venice guest guide',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const left = 48;
    const contentW = pageW - 96;
    let pageNum = 1;

    const drawHeaderBar = () => {
      doc.rect(0, 0, pageW, 10).fill(CANAL);
    };

    const drawFooter = () => {
      const y = doc.page.height - 36;
      doc
        .moveTo(left, y - 8)
        .lineTo(left + contentW, y - 8)
        .lineWidth(0.5)
        .strokeColor(RULE)
        .stroke();
      doc
        .fillColor('#8E8E93')
        .font('Helvetica')
        .fontSize(7.5)
        .text(copy.footer, left, y - 2, {
          width: contentW - 40,
          align: 'left',
          lineBreak: false,
        });
      doc
        .fillColor('#8E8E93')
        .font('Helvetica')
        .fontSize(8)
        .text(String(pageNum), left, y - 2, {
          width: contentW,
          align: 'right',
        });
    };

    const ensureSpace = (need = 80) => {
      if (doc.y + need > doc.page.height - 56) {
        drawFooter();
        doc.addPage();
        pageNum += 1;
        drawHeaderBar();
        doc.y = 36;
      }
    };

    drawHeaderBar();

    // Title block
    doc.y = 36;
    doc
      .fillColor(CANAL)
      .font('Times-Bold')
      .fontSize(24)
      .text(copy.title.toUpperCase(), left, doc.y, { width: contentW });
    doc.moveDown(0.35);
    doc
      .fillColor(GOLD)
      .font('Times-Bold')
      .fontSize(9)
      .text(copy.subtitle.toUpperCase(), { width: contentW });
    doc.moveDown(0.5);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + contentW, doc.y)
      .lineWidth(1)
      .strokeColor(INK)
      .stroke();
    doc.moveDown(0.7);
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(10)
      .text(copy.intro, { width: contentW, lineGap: 2.5, align: 'left' });
    doc.moveDown(0.9);

    for (const section of copy.sections) {
      ensureSpace(70);
      doc
        .fillColor(CANAL)
        .font('Times-Bold')
        .fontSize(13)
        .text(section.heading.toUpperCase(), { width: contentW });
      doc.moveDown(0.2);
      doc
        .moveTo(left, doc.y)
        .lineTo(left + 72, doc.y)
        .lineWidth(1.5)
        .strokeColor(GOLD)
        .stroke();
      doc.moveDown(0.55);

      for (const block of section.blocks) {
        ensureSpace(60);
        // Soft box label
        const labelY = doc.y;
        doc
          .fillColor(BOX)
          .roundedRect(left, labelY, contentW, 18, 3)
          .fill();
        doc
          .fillColor(CANAL)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(block.title, left + 8, labelY + 4.5, {
            width: contentW - 16,
            lineBreak: false,
          });
        doc.y = labelY + 24;

        for (const para of block.paras) {
          ensureSpace(40);
          doc
            .fillColor(MUTED)
            .font('Helvetica')
            .fontSize(9.5)
            .text(para, left, doc.y, {
              width: contentW,
              lineGap: 2.2,
              align: 'left',
            });
          doc.moveDown(0.45);
        }
        doc.moveDown(0.25);
      }
      doc.moveDown(0.35);
    }

    drawFooter();
    doc.end();
  });
}
