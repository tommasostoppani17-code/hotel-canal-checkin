/** Copy only - same layout/CSS. Fallback: en */

export const WELCOME_I18N = {
  it: {
    subject: 'Benvenuto a Venezia',
    htmlTitle: 'Benvenuto - Hotel Canal Venezia',
    subjectRoom: (room) => (room ? `Stanza ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `Siamo felici di ospitarti, ${name}. I tuoi codici per la camera ${room}, il Wi-Fi e un brindisi sulla terrazza sono pronti.`
        : `Siamo felici di ospitarti, ${name}. Ecco Wi-Fi, codici di accesso e un brindisi speciale sulla terrazza.`,
    preheaderNoCoupon:
      'Siamo felici di ospitarti tra i canali. Wi-Fi, codici porta e guida Venezia ti aspettano.',
    claimTitle: 'Voucher in sospeso',
    claimDesc:
      'Sblocca il coupon sconto del 10% per la Trattoria alla Terrazza inserendo il nome dello staff che ti ha assistito.',
    claimBtn: 'Richiedi il tuo regalo di benvenuto',
    textClaim: 'Vuoi il coupon sconto ristorante? Apri questo link:',
    guestFallback: 'Ospite',
    roomFallback: 'Da assegnare',
    greeting: (name) => `Gentile ${name},`,
    welcome:
      'Benvenuto a Venezia. Siamo felici di ospitarti all&rsquo;Hotel Canal. Qui sotto trovi orari, Wi-Fi, codici porta, il percorso a piedi alla Terrazza e il tuo pass di benvenuto.',
    roomLabel: 'Sistemazione riservata',
    roomPrefix: 'CAMERA',
    hoursTitle: 'Ricevimento e orari',
    checkInLabel: 'Check-in:',
    checkInValue: 'dalle ore 14:00',
    checkOutLabel: 'Check-out:',
    checkOutValue: 'entro le ore 10:30',
    wifiTitle: 'Connettivit&agrave; Wi-Fi',
    wifiDesc: 'Rete ad alta velocit&agrave; disponibile in tutta la struttura.',
    networkLabel: 'Rete (SSID)',
    passwordLabel: 'Password',
    doorsTitle: 'Automazione varchi',
    doorsDesc: 'I nostri ingressi sono attivi 24h tramite combinazione digitale.',
    routeTitle: 'Tracciato pedonale privato',
    routeDesc:
      'Venezia sa essere un labirinto magnifico. Segui questa rotta uscendo da Santa Croce 553:',
    step1Title: 'Uscita fondamenta',
    step1Line: 'Esci dall&rsquo;hotel e gira subito a destra costeggiando il Canal Grande.',
    step2Title: 'Linea retta',
    step2Line: 'Cammina dritto per 150 metri tenendo l&rsquo;acqua alla tua sinistra.',
    step3Title: 'Ponte di pietra',
    step3Line:
      'NON attraversare il ponte. Gira a destra nella calle stretta subito prima dei gradini.',
    step4Title: 'Arrivo campiello',
    step4Line:
      'Fai 50 passi: sei arrivato alla Trattoria alla Terrazza sull&rsquo;acqua.',
    mapsBtn: 'Apri in Google Maps',
    discountTitle: 'Privilegio di benvenuto',
    discountBefore: 'Ti abbiamo riservato una convenzione speciale: un ',
    discountBold1: 'esclusivo sconto del 10%',
    discountMid: ' valido sulla cena presso ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ', applicabile a tutti gli occupanti della camera.',
    voucherTitle: 'VOUCHER SCONTO 10%',
    voucherSub: 'CONVENZIONE OSPITI HOTEL CANAL',
    metaCamera: 'CAMERA',
    metaCheckin: 'STAFF',
    metaPax: 'OSPITI',
    tastesTitle: 'Assaggi dalla Terrazza',
    tastesDesc: 'Pesce, risotto e sapori veneziani.',
    veniceTitle: 'Come muoversi',
    veniceIntro:
      'Note essenziali per spostarsi tra i canali. I dettagli completi sono nella guida concierge.',
    veniceActvTitle: 'ACTV Vaporetto',
    veniceActvBody:
      'Biglietti via app o alle biglietterie ufficiali. Obliterate sempre il titolo prima di salire.<br><strong style="color:#164E5B !important;font-style:italic;">Linee 1 / 2</strong> — Canal Grande verso Rialto e San Marco (imbarco vicino a Piazzale Roma / Ferrovia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano:</strong> Linee 4.1 / 4.2 dai moli della stazione.<br><strong style="color:#164E5B !important;font-style:italic;">Burano:</strong> Linea 12 da Fondamente Nove.',
    veniceWalkTitle: 'A piedi',
    veniceWalkBody:
      'Camminare nel centro storico &egrave; il modo migliore per vivere la citt&agrave;.<br><strong style="color:#164E5B !important;font-style:italic;">Ponte di Rialto:</strong> 15–25 minuti dalla lobby.<br><strong style="color:#164E5B !important;font-style:italic;">Piazza San Marco:</strong> 25–40 minuti lungo i percorsi pedonali principali.',
    venicePdfBtn: 'Scarica guida concierge (PDF)',
    ticketTitle: 'Esenzione contributo di accesso',
    ticketDesc:
      'Come ospite dell&rsquo;<strong style="font-style:italic;">Hotel Canal</strong>, sei legalmente esentato dal pagamento del ticket giornaliero di accesso a Venezia. Registra la presenza per ottenere il QR ufficiale del Comune.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Dati per il sito del Comune</span>Motivo: ospite in struttura ricettiva a Venezia<br>Struttura: Hotel Canal (Santa Croce 553)<br>Riferimento: Stanza ',
    ticketBtn: 'Richiedi QR municipalit&agrave;',
    legalText:
      'Questa e-mail &egrave; stata inviata automaticamente dal sistema di check-in dell&rsquo;Hotel Canal. I tuoi dati sono trattati in conformit&agrave; al Regolamento UE 2016/679 (GDPR) per le finalit&agrave; legate al tuo soggiorno. Informativa completa al banco o su hotelcanal.com.',
    wishes: 'Ti auguriamo una splendida esperienza tra i canali di Venezia.',
    signatureLine1: 'La Direzione &amp; lo Staff',
    signatureLine2: 'Hotel Canal Venezia',
    textIntro: 'Benvenuto a Venezia - Hotel Canal, Santa Croce 553.',
    textHours: 'Check-in: dalle 14:00 · Check-out: entro le 10:30',
    textRouteHeader: 'Come raggiungere Trattoria alla Terrazza a piedi:',
    textVoucher:
      'Voucher sconto 10%: mostra il QR di questa email al cameriere.',
    textVenice:
      'Guida Venezia: San Marco, Rialto, Casino, Murano, Burano e mezzi - PDF:',
    textTicket:
      'Esenzione ticket accesso Venezia (ospite in struttura): registra su https://cda.ve.it',
    textSignature: 'La Direzione — Hotel Canal Venezia',
  },
  en: {
    subject: 'Welcome to Venice',
    htmlTitle: 'Welcome - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `Room ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `We are thrilled to have you with us, ${name}. Your access codes for room ${room}, fast Wi-Fi, and a welcome toast on the terrace are ready.`
        : `We are thrilled to have you with us, ${name}. Your access codes, fast Wi-Fi, and a special welcome toast on our canal-view terrace are ready.`,
    preheaderNoCoupon:
      'We are thrilled to have you with us. Wi-Fi, door codes and your Venice guide await.',
    claimTitle: 'Pending welcome gift',
    claimDesc:
      'Unlock your 10% discount coupon for Trattoria alla Terrazza by entering the name of the staff member assisting you.',
    claimBtn: 'Claim your welcome gift',
    textClaim: 'Want the restaurant discount coupon? Open this link:',
    guestFallback: 'Guest',
    roomFallback: 'To assign',
    greeting: (name) => `Dear ${name},`,
    welcome:
      'Welcome to Venice. We are delighted to host you at Hotel Canal. Below you&rsquo;ll find hours, Wi-Fi, door codes, the walk to the Terrazza and your welcome pass.',
    roomLabel: 'Assigned accommodation',
    roomPrefix: 'ROOM',
    hoursTitle: 'Reception hours',
    checkInLabel: 'Check-in:',
    checkInValue: 'from 2:00 PM',
    checkOutLabel: 'Check-out:',
    checkOutValue: 'by 10:30 AM',
    wifiTitle: 'Wi-Fi connectivity',
    wifiDesc: 'High-speed network available throughout the hotel.',
    networkLabel: 'Network (SSID)',
    passwordLabel: 'Password',
    doorsTitle: 'Automated entrances',
    doorsDesc: 'Our gates are active 24h with a digital combination.',
    routeTitle: 'Private walking route',
    routeDesc:
      'Venice can be a beautiful maze. Follow this route from Santa Croce 553:',
    step1Title: 'Fondamenta exit',
    step1Line: 'Leave the hotel and turn right immediately along the Grand Canal.',
    step2Title: 'Straight line',
    step2Line: 'Walk straight for 150 metres, keeping the water on your left.',
    step3Title: 'Stone bridge',
    step3Line:
      'DO NOT cross the bridge. Turn right into the narrow alley just before the steps.',
    step4Title: 'Arrival courtyard',
    step4Line: 'Take 50 steps: you reach Trattoria alla Terrazza on the water.',
    mapsBtn: 'Open in Google Maps',
    discountTitle: 'Welcome privilege',
    discountBefore: 'We reserved a special partnership for you: an ',
    discountBold1: 'exclusive 10% discount',
    discountMid: ' on dinner at ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ', valid for everyone in the room.',
    voucherTitle: '10% DISCOUNT VOUCHER',
    voucherSub: 'HOTEL CANAL GUEST PARTNERSHIP',
    metaCamera: 'ROOM',
    metaCheckin: 'STAFF',
    metaPax: 'GUESTS',
    tastesTitle: 'Tastes from the Terrazza',
    tastesDesc: 'Fish, risotto and Venetian flavours.',
    veniceTitle: 'Getting around',
    veniceIntro:
      'Essential notes for moving around the canals. Full details are in the concierge guide.',
    veniceActvTitle: 'ACTV Vaporetto',
    veniceActvBody:
      'Tickets via app or official ticket offices. Always validate before boarding.<br><strong style="color:#164E5B !important;font-style:italic;">Lines 1 / 2</strong> — Grand Canal toward Rialto and San Marco (dock near Piazzale Roma / Santa Lucia).',
    veniceIslandsTitle: 'Murano &amp; Burano Islands',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano:</strong> Lines 4.1 / 4.2 from the station docks.<br><strong style="color:#164E5B !important;font-style:italic;">Burano:</strong> Line 12 from Fondamente Nove.',
    veniceWalkTitle: 'On foot',
    veniceWalkBody:
      'Walking the historic center is the best way to experience the city.<br><strong style="color:#164E5B !important;font-style:italic;">Rialto Bridge:</strong> 15–25 minutes from the lobby.<br><strong style="color:#164E5B !important;font-style:italic;">San Marco Square:</strong> 25–40 minutes along the main pedestrian routes.',
    venicePdfBtn: 'Download concierge guide (PDF)',
    ticketTitle: 'Access fee exemption',
    ticketDesc:
      'As a guest of <strong style="font-style:italic;">Hotel Canal</strong>, you are legally exempt from Venice&rsquo;s daily access fee. Register your stay to receive the official municipal QR code.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Details for the municipal website</span>Reason: guest in an accommodation facility in Venice<br>Property: Hotel Canal (Santa Croce 553)<br>Reference: Room ',
    ticketBtn: 'Request municipal QR',
    legalText:
      'This e-mail was sent automatically by the Hotel Canal check-in system. Your personal data is processed under EU Regulation 2016/679 (GDPR) for hospitality purposes related to your stay. Full privacy notice at the desk or on hotelcanal.com.',
    wishes: 'We wish you a wonderful journey through the canals of Venice.',
    signatureLine1: 'Management &amp; Staff',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'Welcome to Venice - Hotel Canal, Santa Croce 553.',
    textHours: 'Check-in: from 2:00 PM · Check-out: by 10:30 AM',
    textRouteHeader: 'How to reach Trattoria alla Terrazza on foot:',
    textVoucher:
      '10% discount voucher: show the QR in this email to your waiter.',
    textVenice:
      'Venice guide: San Marco, Rialto, Casino, Murano, Burano & transport - PDF:',
    textTicket:
      'Venice access fee exemption (hotel guest): register at https://cda.ve.it',
    textSignature: 'The Management - Hotel Canal Venice',
  },
  fr: {
    subject: 'Bienvenue à Venise',
    htmlTitle: 'Bienvenue - Hotel Canal Venise',
    subjectRoom: (room) => (room ? `Chambre ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `Nous sommes ravis de vous accueillir, ${name}. Codes d'accès pour la chambre ${room}, Wi-Fi et un toast de bienvenue sur la terrasse vous attendent.`
        : `Nous sommes ravis de vous accueillir, ${name}. Wi-Fi, codes d'accès et un toast de bienvenue sur la terrasse sont prêts.`,
    preheaderNoCoupon:
      'Nous sommes ravis de vous accueillir. Wi-Fi, codes porte et guide de Venise vous attendent.',
    claimTitle: 'Réduction restaurant 10%',
    claimDesc:
      'Vous souhaitez le bon de réduction Trattoria alla Terrazza ? Activez-le en un clic.',
    claimBtn: 'Vous voulez le coupon ? Cliquez ici',
    textClaim: 'Vous voulez le coupon resto ? Ouvrez ce lien :',
    guestFallback: 'Client',
    roomFallback: 'À assigner',
    greeting: (name) => `Cher/Chère ${name},`,
    welcome:
      'Bienvenue à Venise. Nous sommes ravis de vous accueillir à l&rsquo;Hotel Canal. Horaires, accès, itinéraire à pied vers notre restaurant partenaire et votre pass de bienvenue sont ci-dessous.',
    roomLabel: 'CHAMBRE ASSIGNÉE',
    roomPrefix: 'CHAMBRE',
    hoursTitle: 'Horaires de la structure',
    checkInLabel: 'Check-in :',
    checkInValue: 'à partir de 14h00',
    checkOutLabel: 'Check-out :',
    checkOutValue: 'avant 10h30',
    wifiTitle: 'Wi-Fi',
    wifiDesc: 'Connexion gratuite dans tout l&rsquo;hôtel.',
    networkLabel: 'Réseau',
    passwordLabel: 'Mot de passe',
    doorsTitle: 'Codes porte',
    doorsDesc: 'Saisissez le code sur le clavier de la porte.',
    routeTitle: 'À pied vers la Terrazza',
    routeDesc: 'Depuis Santa Croce 553 - quatre étapes, cinq minutes.',
    step1Title: 'Sortez et tournez à droite',
    step1Line: 'Le long de la Fondamenta, Grand Canal à gauche.',
    step2Title: 'Cent cinquante mètres',
    step2Line: 'Tout droit jusqu&rsquo;au premier pont en pierre.',
    step3Title: 'Ne traversez pas',
    step3Line: 'Avant les marches, à droite dans le sotoportego.',
    step4Title: 'Arrivée',
    step4Line: 'Cinquante pas : Trattoria alla Terrazza sur l&rsquo;eau.',
    mapsBtn: 'Ouvrir Google Maps',
    discountTitle: 'Offre de bienvenue',
    discountBefore: 'Présentez ce pass au serveur ',
    discountBold1: 'avant de commander',
    discountMid: ' pour bénéficier d&rsquo;une ',
    discountBold2: 'réduction de 10%',
    discountAfter:
      ' sur le total, valable pour tous les occupants de la chambre.',
    voucherTitle: 'BON DE RÉDUCTION 10%',
    voucherSub: 'TRATTORIA ALLA TERRAZZA - CONVENTION CLIENTS',
    metaCamera: 'CHAMBRE',
    metaCheckin: 'CHECK-IN',
    metaPax: 'PAX',
    tastesTitle: 'Saveurs de la Terrazza',
    tastesDesc: 'Poisson, risotto et saveurs vénitiennes.',
    veniceTitle: 'Get Around',
    veniceIntro:
      'Notes essentielles sur les transports. Les détails San Marco, Rialto, Lido, Murano et Burano sont dans le guide conciergerie.',
    veniceActvTitle: 'ACTV Vaporetto',
    veniceActvBody:
      'Billets via appli ou aux guichets officiels. Compostez toujours avant l&rsquo;embarquement.<br><strong style="color:#164E5B !important;">Lignes 1 / 2</strong> - Grand Canal vers Rialto et San Marco (débarcadère près de Piazzale Roma / Santa Lucia).',
    veniceIslandsTitle: 'Îles Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;">Murano :</strong> Lignes 4.1 / 4.2 depuis les quais de la gare.<br><strong style="color:#164E5B !important;">Burano :</strong> Ligne 12 depuis Fondamente Nove.',
    veniceWalkTitle: 'À pied',
    veniceWalkBody:
      'Marcher dans le centre historique est la meilleure façon de découvrir la ville.<br><strong style="color:#164E5B !important;">Pont du Rialto :</strong> 15-25 minutes depuis le hall.<br><strong style="color:#164E5B !important;">Place Saint-Marc :</strong> 25-40 minutes par les parcours piétons principaux.',
    venicePdfBtn: 'Télécharger le guide Venise (PDF)',
    ticketTitle: 'Exemption du ticket d&rsquo;accès à Venise',
    ticketDesc:
      'En tant qu&rsquo;hôte de l&rsquo;<strong>Hotel Canal</strong>, vous êtes totalement exonéré du droit d&rsquo;accès journalier à Venise. Il vous suffit d&rsquo;enregistrer votre séjour pour obtenir le QR Code officiel de la municipalité.',
    ticketBox:
      '<strong>Données à saisir sur le site de la municipalité :</strong><br>&bull; Motif d&rsquo;exonération : Client d&rsquo;un établissement d&rsquo;hébergement à Venise<br>&bull; Nom de la structure : Hotel Canal (Santa Croce 553)<br>&bull; Référence : Chambre ',
    ticketBtn: 'Obtenir le QR Code d&rsquo;exonération',
    legalText:
      'Cet e-mail a été envoyé automatiquement par le système de check-in de l&rsquo;Hotel Canal. Vos données sont traitées conformément au Règlement UE 2016/679 (RGPD) pour les finalités liées à votre séjour. Vous pouvez consulter notre politique de confidentialité à la réception ou sur hotelcanal.com.',
    wishes: 'Nous vous souhaitons un séjour inoubliable.',
    signatureLine1: 'La Direction',
    signatureLine2: 'Hotel Canal Venise',
    textIntro: 'Bienvenue à Venise - Hotel Canal, Santa Croce 553.',
    textHours: 'Check-in : à partir de 14h00 · Check-out : avant 10h30',
    textRouteHeader: 'Comment rejoindre Trattoria alla Terrazza à pied :',
    textVoucher:
      'Bon de réduction 10 % : montrez le QR de cet e-mail au serveur.',
    textVenice:
      'Guide Venise : San Marco, Rialto, Casino, Murano, Burano - PDF :',
    textTicket:
      'Exemption ticket d\'accès Venise (client hébergé) : enregistrez sur https://cda.ve.it',
    textSignature: 'La Direction - Hotel Canal Venise',
  },
  de: {
    subject: 'Willkommen in Venedig',
    htmlTitle: 'Willkommen - Hotel Canal Venedig',
    subjectRoom: (room) => (room ? `Zimmer ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `Wir freuen uns, Sie begrüßen zu dürfen, ${name}. Zugangscodes für Zimmer ${room}, WLAN und ein Willkommenstoast auf der Terrasse warten auf Sie.`
        : `Wir freuen uns, Sie begrüßen zu dürfen, ${name}. WLAN, Zugangscodes und ein Willkommenstoast auf der Terrasse sind bereit.`,
    preheaderNoCoupon:
      'Wir freuen uns auf Sie. WLAN, Türcodes und der Venedig-Guide erwarten Sie.',
    claimTitle: '10% Restaurant-Rabatt',
    claimDesc:
      'Möchten Sie den Gutschein für die Trattoria alla Terrazza? Mit einem Tip aktivieren.',
    claimBtn: 'Gutschein gewünscht? Hier tippen',
    textClaim: 'Restaurant-Gutschein gewünscht? Link öffnen:',
    guestFallback: 'Gast',
    roomFallback: 'Offen',
    greeting: (name) => `Sehr geehrte/r ${name},`,
    welcome:
      'Willkommen in Venedig. Wir freuen uns, Sie im Hotel Canal begrüßen zu dürfen. Zeiten, Zugang, Fußweg zu unserem Partnerrestaurant und Ihr Willkommenspass finden Sie unten.',
    roomLabel: 'ZUGEWIESENES ZIMMER',
    roomPrefix: 'ZIMMER',
    hoursTitle: 'Zeiten der Struktur',
    checkInLabel: 'Check-in:',
    checkInValue: 'ab 14:00 Uhr',
    checkOutLabel: 'Check-out:',
    checkOutValue: 'bis 10:30 Uhr',
    wifiTitle: 'Wi-Fi',
    wifiDesc: 'Kostenlose Verbindung im gesamten Haus.',
    networkLabel: 'Netzwerk',
    passwordLabel: 'Passwort',
    doorsTitle: 'Türcodes',
    doorsDesc: 'Geben Sie den Code auf der Tastatur der Tür ein.',
    routeTitle: 'Zu Fuß zur Terrazza',
    routeDesc: 'Von Santa Croce 553 - vier Schritte, fünf Minuten.',
    step1Title: 'Hinaus und rechts abbiegen',
    step1Line: 'Entlang der Fondamenta, Canal Grande links.',
    step2Title: 'Hundertfünfzig Meter',
    step2Line: 'Geradeaus bis zur ersten Steinbrücke.',
    step3Title: 'Nicht überqueren',
    step3Line: 'Vor den Stufen rechts in den Sotoportego.',
    step4Title: 'Ankunft',
    step4Line: 'Fünfzig Schritte: Trattoria alla Terrazza am Wasser.',
    mapsBtn: 'Google Maps öffnen',
    discountTitle: 'Willkommensrabatt',
    discountBefore: 'Zeigen Sie diesen Pass dem Kellner ',
    discountBold1: 'vor der Bestellung',
    discountMid: ', um ',
    discountBold2: '5 % Rabatt',
    discountAfter:
      ' auf die Gesamtrechnung zu erhalten - gültig für alle Personen im Zimmer.',
    voucherTitle: '10% RABATTGUTSCHEIN',
    voucherSub: 'TRATTORIA ALLA TERRAZZA - GÄSTEPARTNERSCHAFT',
    metaCamera: 'ZIMMER',
    metaCheckin: 'CHECK-IN',
    metaPax: 'PAX',
    tastesTitle: 'Kostproben von der Terrazza',
    tastesDesc: 'Fisch, Risotto und venezianische Aromen.',
    veniceTitle: 'Get Around',
    veniceIntro:
      'Wichtige Verkehrshinweise. Details zu San Marco, Rialto, Lido, Murano und Burano finden Sie im Concierge-Guide.',
    veniceActvTitle: 'ACTV Vaporetto',
    veniceActvBody:
      'Tickets in der App oder an offiziellen Schaltern. Vor dem Einsteigen entwerten.<br><strong style="color:#164E5B !important;">Linien 1 / 2</strong> - Canal Grande nach Rialto und San Marco (Anleger nahe Piazzale Roma / Santa Lucia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;">Murano:</strong> Linien 4.1 / 4.2 von den Stationsanlegern.<br><strong style="color:#164E5B !important;">Burano:</strong> Linie 12 ab Fondamente Nove.',
    veniceWalkTitle: 'Zu Fuß',
    veniceWalkBody:
      'Zu Fuß durch die Altstadt ist der schönste Weg, Venedig zu erleben.<br><strong style="color:#164E5B !important;">Rialtobrücke:</strong> 15-25 Minuten von der Lobby.<br><strong style="color:#164E5B !important;">Markusplatz:</strong> 25-40 Minuten über die Hauptwege.',
    venicePdfBtn: 'Venedig-Guide herunterladen (PDF)',
    ticketTitle: 'Befreiung von der Venedig-Zutrittsgebühr',
    ticketDesc:
      'Als Gast des <strong>Hotel Canal</strong> sind Sie vollständig von der täglichen Zutrittsgebühr für Venedig befreit. Sie müssen Ihren Aufenthalt nur registrieren, um den offiziellen QR-Code der Stadt zu erhalten.',
    ticketBox:
      '<strong>Angaben für die Website der Stadt:</strong><br>&bull; Grund der Befreiung: Gast in einer Unterkunft in Venedig<br>&bull; Name der Unterkunft: Hotel Canal (Santa Croce 553)<br>&bull; Referenz: Zimmer ',
    ticketBtn: 'Offiziellen Befreiungs-QR-Code holen',
    legalText:
      'Diese E-Mail wurde automatisch vom Check-in-System des Hotel Canal gesendet. Ihre Daten werden gemäß EU-Verordnung 2016/679 (DSGVO) für Zwecke Ihres Aufenthalts verarbeitet. Die vollständige Datenschutzerklärung finden Sie an der Rezeption oder auf hotelcanal.com.',
    wishes: 'Wir wünschen Ihnen einen unvergesslichen Aufenthalt.',
    signatureLine1: 'Die Direktion',
    signatureLine2: 'Hotel Canal Venedig',
    textIntro: 'Willkommen in Venedig - Hotel Canal, Santa Croce 553.',
    textHours: 'Check-in: ab 14:00 · Check-out: bis 10:30',
    textRouteHeader: 'Fußweg zur Trattoria alla Terrazza:',
    textVoucher:
      '10%-Gutschein: zeigen Sie den QR in dieser E-Mail dem Kellner.',
    textVenice:
      'Venedig-Guide: San Marco, Rialto, Casino, Murano, Burano - PDF:',
    textTicket:
      'Befreiung Venedig-Zutritt (Hotelgast): Registrierung unter https://cda.ve.it',
    textSignature: 'Die Direktion - Hotel Canal Venedig',
  },
  es: {
    subject: 'Bienvenido a Venecia',
    htmlTitle: 'Bienvenido - Hotel Canal Venecia',
    subjectRoom: (room) => (room ? `Habitación ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `Estamos encantados de recibirle, ${name}. Códigos de acceso para la habitación ${room}, Wi-Fi y un brindis de bienvenida en la terraza le esperan.`
        : `Estamos encantados de recibirle, ${name}. Wi-Fi, códigos de acceso y un brindis de bienvenida en la terraza están listos.`,
    preheaderNoCoupon:
      'Estamos encantados de recibirle. Wi-Fi, códigos de puerta y guía de Venecia le esperan.',
    claimTitle: 'Descuento restaurante 10%',
    claimDesc:
      '¿Quiere el cupón de descuento de Trattoria alla Terrazza? Actívelo en un toque.',
    claimBtn: '¿Quiere el cupón? Pulse aquí',
    textClaim: '¿Quiere el cupón del restaurante? Abra este enlace:',
    guestFallback: 'Huésped',
    roomFallback: 'Por asignar',
    greeting: (name) => `Estimado/a ${name},`,
    welcome:
      'Bienvenido a Venecia. Estamos encantados de alojarle en el Hotel Canal. Horarios, acceso, ruta a pie al restaurante asociado y su pase de bienvenida están más abajo.',
    roomLabel: 'HABITACIÓN ASIGNADA',
    roomPrefix: 'HABITACIÓN',
    hoursTitle: 'Horarios de la estructura',
    checkInLabel: 'Check-in:',
    checkInValue: 'desde las 14:00',
    checkOutLabel: 'Check-out:',
    checkOutValue: 'antes de las 10:30',
    wifiTitle: 'Wi-Fi',
    wifiDesc: 'Conexión gratuita en toda la estructura.',
    networkLabel: 'Red',
    passwordLabel: 'Contraseña',
    doorsTitle: 'Códigos de puerta',
    doorsDesc: 'Introduzca el código en el teclado de la puerta.',
    routeTitle: 'A pie a la Terrazza',
    routeDesc: 'Desde Santa Croce 553 - cuatro pasos, cinco minutos.',
    step1Title: 'Salga y gire a la derecha',
    step1Line: 'Por la Fondamenta, Canal Grande a la izquierda.',
    step2Title: 'Ciento cincuenta metros',
    step2Line: 'Recto hasta el primer puente de piedra.',
    step3Title: 'No cruce',
    step3Line: 'Antes de los escalones, a la derecha en el sotoportego.',
    step4Title: 'Llegada',
    step4Line: 'Cincuenta pasos: Trattoria alla Terrazza sobre el agua.',
    mapsBtn: 'Abrir Google Maps',
    discountTitle: 'Descuento de bienvenida',
    discountBefore: 'Presente este pase al camarero ',
    discountBold1: 'antes de pedir',
    discountMid: ' para recibir un ',
    discountBold2: 'descuento del 10%',
    discountAfter:
      ' sobre el total, válido para todos los ocupantes de la habitación.',
    voucherTitle: 'CUPÓN DE DESCUENTO 10%',
    voucherSub: 'TRATTORIA ALLA TERRAZZA - CONVENIO HUÉSPEDES',
    metaCamera: 'HABITACIÓN',
    metaCheckin: 'CHECK-IN',
    metaPax: 'PAX',
    tastesTitle: 'Sabores de la Terrazza',
    tastesDesc: 'Pescado, risotto y sabores venecianos.',
    veniceTitle: 'Get Around',
    veniceIntro:
      'Notas esenciales de transporte. Los detalles de San Marco, Rialto, Lido, Murano y Burano están en la guía de conserjería.',
    veniceActvTitle: 'ACTV Vaporetto',
    veniceActvBody:
      'Billetes en la app o en taquillas oficiales. Valide siempre antes de subir.<br><strong style="color:#164E5B !important;">Líneas 1 / 2</strong> - Canal Grande hacia Rialto y San Marco (embarque cerca de Piazzale Roma / Santa Lucia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;">Murano:</strong> Líneas 4.1 / 4.2 desde los muelles de la estación.<br><strong style="color:#164E5B !important;">Burano:</strong> Línea 12 desde Fondamente Nove.',
    veniceWalkTitle: 'A pie',
    veniceWalkBody:
      'Caminar por el centro histórico es la mejor forma de vivir la ciudad.<br><strong style="color:#164E5B !important;">Puente de Rialto:</strong> 15-25 minutos desde el hall.<br><strong style="color:#164E5B !important;">Plaza San Marcos:</strong> 25-40 minutos por las rutas peatonales principales.',
    venicePdfBtn: 'Descargar guía completa Venecia (PDF)',
    ticketTitle: 'Exención del ticket de acceso a Venecia',
    ticketDesc:
      'Como huésped del <strong>Hotel Canal</strong>, está totalmente exento del pago de la tasa diaria de acceso a Venecia. Solo debe registrar su estancia para obtener el código QR oficial del Ayuntamiento.',
    ticketBox:
      '<strong>Datos a introducir en el sitio municipal:</strong><br>&bull; Motivo de exención: Huésped en establecimiento de alojamiento en Venecia<br>&bull; Nombre del establecimiento: Hotel Canal (Santa Croce 553)<br>&bull; Referencia: Habitación ',
    ticketBtn: 'Obtener código QR de exención',
    legalText:
      'Este correo se envió automáticamente desde el sistema de check-in del Hotel Canal. Sus datos se tratan conforme al Reglamento UE 2016/679 (RGPD) para fines relacionados con su estancia. Puede consultar la política de privacidad en recepción o en hotelcanal.com.',
    wishes: 'Le deseamos una estancia inolvidable.',
    signatureLine1: 'La Dirección',
    signatureLine2: 'Hotel Canal Venecia',
    textIntro: 'Bienvenido a Venecia - Hotel Canal, Santa Croce 553.',
    textHours: 'Check-in: desde las 14:00 · Check-out: antes de las 10:30',
    textRouteHeader: 'Cómo llegar a pie a Trattoria alla Terrazza:',
    textVoucher:
      'Cupón 10%: muestre el QR de este correo al camarero.',
    textVenice:
      'Guía Venecia: San Marco, Rialto, Casino, Murano, Burano - PDF:',
    textTicket:
      'Exención ticket acceso Venecia (huésped hotel): registre en https://cda.ve.it',
    textSignature: 'La Dirección - Hotel Canal Venecia',
  },
};

export function resolveWelcomeLang(raw) {
  const code = String(raw || '')
    .trim()
    .slice(0, 2)
    .toLowerCase();
  return WELCOME_I18N[code] ? code : 'en';
}

export function welcomeCopy(lang) {
  return WELCOME_I18N[resolveWelcomeLang(lang)];
}
