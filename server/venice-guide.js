import PDFDocument from 'pdfkit';

const CANAL = '#124453';
const GOLD = '#C5A059';
const MUTED = '#515154';
const RULE = '#E5E5EA';

const GUIDE = {
  en: {
    title: 'Venice Guest Guide',
    subtitle: 'Hotel Canal · Santa Croce 553',
    intro:
      'A short practical guide from reception: how to move around and what not to miss.',
    transportTitle: 'Getting around',
    transport: [
      'Buy ACTV tickets (vaporetto) via the official app or ticket machines at major stops.',
      'From Santa Croce / Piazzale Roma area you can walk many sights; for islands use vaporetto.',
      'Water taxi is faster but expensive. Gondolas are for atmosphere, not transport.',
      'Validate paper tickets before boarding. Keep your ticket for inspections.',
    ],
    placesTitle: 'Highlights & how to get there',
    places: [
      {
        name: 'San Marco',
        body: 'Basilica, Piazza and Campanile. Walk ~25-35 min via Rialto, or vaporetto Line 1 / 2 to San Marco / San Zaccaria. Go early morning or late evening for fewer crowds.',
      },
      {
        name: 'Rialto',
        body: 'Bridge and market. Pleasant walk from Santa Croce along the Grand Canal side streets (~15-20 min). Best before midday for the market.',
      },
      {
        name: 'Casino di Venezia (Ca\' Vendramin)',
        body: 'Cannaregio waterfront. Vaporetto Line 1 to San Marcuola, then a short walk. Smart dress code applies in the evening rooms.',
      },
      {
        name: 'Murano',
        body: 'Glass island. From Ferrovia / Piazzale Roma take vaporetto Line 4.1 / 4.2 (or 3). Visit a fornace for glassmaking demos; avoid pushy street sellers.',
      },
      {
        name: 'Burano',
        body: 'Colourful houses and lace. From Murano continue on Line 12 to Burano (or from Fondamente Nove). Allow half a day; lunch on the island is worth it.',
      },
    ],
    tipsTitle: 'What to do',
    tips: [
      'Sunset from Accademia Bridge or Zattere.',
      'Cicchetti and a spritz in a bacaro (try the Dorsoduro / San Polo side).',
      'Quiet morning walk through Santa Croce and San Polo before cruise crowds arrive.',
      'Book restaurants for dinner; our partner Trattoria alla Terrazza is a 5-minute walk.',
      'Wear comfortable shoes. Bridges and stone can be slippery when wet.',
    ],
    footer: 'Hotel Canal · Concierge notes · Ask reception for tickets and timetables',
  },
  it: {
    title: 'Guida ospite Venezia',
    subtitle: 'Hotel Canal · Santa Croce 553',
    intro:
      'Guida pratica dalla reception: come muoversi e cosa non perdere.',
    transportTitle: 'Come muoversi',
    transport: [
      'Biglietti ACTV (vaporetto) dall\'app ufficiale o dalle biglietterie alle fermate principali.',
      'Da Santa Croce / Piazzale Roma si raggiungono a piedi molti punti; per le isole usare il vaporetto.',
      'Water taxi: veloce ma costoso. La gondola e\' atmosfera, non trasporto.',
      'Obliterare i biglietti cartacei prima di salire. Tenere il titolo a bordo.',
    ],
    placesTitle: 'Luoghi e come arrivarci',
    places: [
      {
        name: 'San Marco',
        body: 'Basilica, Piazza e Campanile. A piedi ~25-35 min via Rialto, oppure vaporetto Linea 1 / 2 per San Marco / San Zaccaria. Meglio al mattino presto o di sera.',
      },
      {
        name: 'Rialto',
        body: 'Ponte e mercato. Passeggiata piacevole da Santa Croce (~15-20 min). Mercato ideale prima di mezzogiorno.',
      },
      {
        name: 'Casinò di Venezia (Ca\' Vendramin)',
        body: 'Cannaregio. Vaporetto Linea 1 a San Marcuola, poi breve camminata. Abbigliamento curato la sera.',
      },
      {
        name: 'Murano',
        body: 'Isola del vetro. Da Ferrovia / Piazzale Roma Linea 4.1 / 4.2 (o 3). Visitate una fornace; evitate venditori aggressivi.',
      },
      {
        name: 'Burano',
        body: 'Case colorate e merletti. Da Murano Linea 12 (o da Fondamente Nove). Prevedete mezza giornata; pranzo sull\'isola consigliato.',
      },
    ],
    tipsTitle: 'Cosa fare',
    tips: [
      'Tramonto dal Ponte dell\'Accademia o alle Zattere.',
      'Cicchetti e spritz in un bacaro (zona Dorsoduro / San Polo).',
      'Passeggiata mattutina in Santa Croce e San Polo prima delle folle.',
      'Prenotate la cena: la Trattoria alla Terrazza e\' a 5 minuti a piedi.',
      'Scarpe comode. I ponti bagnati possono essere scivolosi.',
    ],
    footer: 'Hotel Canal · Note concierge · In reception per biglietti e orari',
  },
  fr: {
    title: 'Guide invité Venise',
    subtitle: 'Hotel Canal · Santa Croce 553',
    intro:
      'Guide pratique de la réception : se déplacer et ne rien manquer.',
    transportTitle: 'Se déplacer',
    transport: [
      'Billets ACTV (vaporetto) via l\'appli officielle ou les distributeurs.',
      'Depuis Santa Croce / Piazzale Roma, beaucoup de sites se font à pied ; îles en vaporetto.',
      'Water taxi : rapide mais cher. La gondole est une expérience, pas un transport.',
      'Compostez les billets papier avant l\'embarquement.',
    ],
    placesTitle: 'Incontournables et accès',
    places: [
      {
        name: 'San Marco',
        body: 'Basilique, place et campanile. ~25-35 min à pied via Rialto, ou lignes 1 / 2. Tôt le matin ou le soir.',
      },
      {
        name: 'Rialto',
        body: 'Pont et marché. ~15-20 min à pied depuis Santa Croce. Marché avant midi.',
      },
      {
        name: 'Casino de Venise',
        body: 'Cannaregio. Ligne 1 jusqu\'à San Marcuola. Tenue soignée le soir.',
      },
      {
        name: 'Murano',
        body: 'Île du verre. Lignes 4.1 / 4.2 (ou 3). Visitez une fournaise.',
      },
      {
        name: 'Burano',
        body: 'Maisons colorées. Depuis Murano ligne 12. Prévoir une demi-journée.',
      },
    ],
    tipsTitle: 'À faire',
    tips: [
      'Coucher de soleil depuis Accademia ou Zattere.',
      'Cicchetti et spritz dans un bacaro.',
      'Promenade matinale à Santa Croce / San Polo.',
      'Réservez le dîner : Trattoria alla Terrazza à 5 minutes.',
      'Chaussures confortables.',
    ],
    footer: 'Hotel Canal · Notes conciergerie',
  },
  de: {
    title: 'Venedig Gästeführer',
    subtitle: 'Hotel Canal · Santa Croce 553',
    intro:
      'Praktischer Guide der Rezeption: Mobilität und Highlights.',
    transportTitle: 'Unterwegs',
    transport: [
      'ACTV-Tickets (Vaporetto) per App oder Automaten.',
      'Von Santa Croce / Piazzale Roma vieles zu Fuß; Inseln per Vaporetto.',
      'Wassertaxi schnell aber teuer. Gondel ist Erlebnis, kein Transport.',
      'Papiertickets vor dem Einsteigen entwerten.',
    ],
    placesTitle: 'Highlights & Anfahrt',
    places: [
      {
        name: 'San Marco',
        body: 'Basilika und Piazza. ~25-35 Min. zu Fuß via Rialto oder Linie 1 / 2. Früh oder abends.',
      },
      {
        name: 'Rialto',
        body: 'Brücke und Markt. ~15-20 Min. von Santa Croce. Markt vormittags.',
      },
      {
        name: 'Casino di Venezia',
        body: 'Cannaregio. Linie 1 nach San Marcuola. Abendkleidung empfohlen.',
      },
      {
        name: 'Murano',
        body: 'Glasinsel. Linie 4.1 / 4.2 (oder 3). Glasofen besuchen.',
      },
      {
        name: 'Burano',
        body: 'Bunte Häuser. Ab Murano Linie 12. Halber Tag einplanen.',
      },
    ],
    tipsTitle: 'Tipps',
    tips: [
      'Sonnenuntergang an Accademia oder Zattere.',
      'Cicchetti und Spritz in einem Bacaro.',
      'Morgenspaziergang Santa Croce / San Polo.',
      'Abendessen reservieren: Terrazza 5 Gehminuten.',
      'Bequeme Schuhe.',
    ],
    footer: 'Hotel Canal · Concierge-Hinweise',
  },
  es: {
    title: 'Guía de huésped Venecia',
    subtitle: 'Hotel Canal · Santa Croce 553',
    intro:
      'Guía práctica de recepción: cómo moverse y qué no perderse.',
    transportTitle: 'Cómo moverse',
    transport: [
      'Billetes ACTV (vaporetto) en la app oficial o máquinas.',
      'Desde Santa Croce / Piazzale Roma muchos sitios a pie; islas en vaporetto.',
      'Water taxi: rápido pero caro. La góndola es experiencia, no transporte.',
      'Valide billetes de papel antes de subir.',
    ],
    placesTitle: 'Lugares y cómo llegar',
    places: [
      {
        name: 'San Marco',
        body: 'Basílica y plaza. ~25-35 min a pie vía Rialto o líneas 1 / 2. Mejor temprano o de noche.',
      },
      {
        name: 'Rialto',
        body: 'Puente y mercado. ~15-20 min desde Santa Croce. Mercado por la mañana.',
      },
      {
        name: 'Casino de Venecia',
        body: 'Cannaregio. Línea 1 a San Marcuola. Vestimenta elegante por la noche.',
      },
      {
        name: 'Murano',
        body: 'Isla del vidrio. Líneas 4.1 / 4.2 (o 3). Visite un horno.',
      },
      {
        name: 'Burano',
        body: 'Casas de colores. Desde Murano línea 12. Media jornada.',
      },
    ],
    tipsTitle: 'Qué hacer',
    tips: [
      'Atardecer desde Accademia o Zattere.',
      'Cicchetti y spritz en un bacaro.',
      'Paseo matutino por Santa Croce / San Polo.',
      'Reserve cena: Terrazza a 5 minutos a pie.',
      'Zapatos cómodos.',
    ],
    footer: 'Hotel Canal · Notas de conserjería',
  },
};

function resolveGuideLang(raw) {
  const code = String(raw || '')
    .trim()
    .slice(0, 2)
    .toLowerCase();
  return GUIDE[code] ? code : 'en';
}

export function buildVeniceGuidePdfBuffer(lang = 'en') {
  const copy = GUIDE[resolveGuideLang(lang)];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
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

    doc.rect(0, 0, pageW, 12).fill(CANAL);

    doc
      .fillColor(CANAL)
      .font('Times-Bold')
      .fontSize(22)
      .text(copy.title.toUpperCase(), left, 40, { width: contentW, align: 'left' });
    doc
      .fillColor(GOLD)
      .font('Times-Bold')
      .fontSize(9)
      .text(copy.subtitle.toUpperCase(), left, 70, { width: contentW });
    doc
      .moveTo(left, 88)
      .lineTo(left + contentW, 88)
      .lineWidth(0.8)
      .strokeColor('#1D1D1F')
      .stroke();

    let y = 104;
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(10)
      .text(copy.intro, left, y, { width: contentW, lineGap: 2 });
    y = doc.y + 16;

    const section = (title) => {
      if (y > 720) {
        doc.addPage();
        y = 48;
      }
      doc
        .fillColor(CANAL)
        .font('Times-Bold')
        .fontSize(12)
        .text(title.toUpperCase(), left, y, { width: contentW });
      y = doc.y + 8;
    };

    const bullets = (items) => {
      for (const item of items) {
        if (y > 760) {
          doc.addPage();
          y = 48;
        }
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(9.5)
          .text(`•  ${item}`, left, y, { width: contentW, lineGap: 2 });
        y = doc.y + 6;
      }
      y += 8;
    };

    section(copy.transportTitle);
    bullets(copy.transport);

    section(copy.placesTitle);
    for (const place of copy.places) {
      if (y > 740) {
        doc.addPage();
        y = 48;
      }
      doc
        .fillColor(CANAL)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(place.name, left, y, { width: contentW });
      y = doc.y + 3;
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(9.5)
        .text(place.body, left, y, { width: contentW, lineGap: 2 });
      y = doc.y + 10;
    }

    section(copy.tipsTitle);
    bullets(copy.tips);

    doc
      .moveTo(left, Math.min(y + 8, 780))
      .lineTo(left + contentW, Math.min(y + 8, 780))
      .lineWidth(0.6)
      .strokeColor(RULE)
      .stroke();
    doc
      .fillColor('#8E8E93')
      .font('Helvetica')
      .fontSize(8)
      .text(copy.footer, left, Math.min(y + 18, 800), {
        width: contentW,
        align: 'center',
      });

    doc.end();
  });
}
