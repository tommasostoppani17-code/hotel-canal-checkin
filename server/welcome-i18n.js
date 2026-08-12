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
    doorsTitle: 'Codici di accesso',
    doorsDesc:
      'Per entrare in hotel di notte o quando la reception &egrave; chiusa, digita il codice sul tastierino della porta.',
    doorMainLabel: 'Entrata principale',
    doorInnerLabel: 'Porta interna',
    routeTitle: 'A piedi verso la Terrazza',
    routeDesc:
      'Circa otto minuti dall&rsquo;hotel (Santa Croce 553) a Trattoria alla Terrazza, San Polo 2426. Meglio aprire anche Maps:',
    step1Title: 'Esci e gira a sinistra',
    step1Line:
      'Lascia il Canal Grande alle spalle e prendi subito Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Dopo circa settanta metri entra in Calle de le Case Nove e prosegui dritto fino al campiello.',
    step3Title: 'Verso Rio Marin',
    step3Line:
      'Dal Campiello de le Muneghe passa in Calle Sechera e Corte Canal, fino a Fondamenta Rio Marin.',
    step4Title: 'Sei arrivato',
    step4Line:
      'Segui Fondamenta Rio Marin: in Calle de l&rsquo;Ogio trovi Trattoria alla Terrazza.',
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
    tastesDesc: 'Pesce, pasta e sapori veneziani.',
    veniceTitle: 'Come muoversi a Venezia',
    veniceIntro:
      'Dalla reception sei vicino a Piazzale Roma e alla stazione. A piedi segui i cartelli gialli (il GPS nelle calli spesso sbaglia).',
    veniceActvTitle: 'Vaporetto ACTV',
    veniceActvBody:
      'Biglietti sull&rsquo;app AVM Venezia / ACTV o alle biglietterie ufficiali; oblitera prima di salire. Linee <strong style="color:#164E5B !important;font-style:italic;">1</strong> e <strong style="color:#164E5B !important;font-style:italic;">2</strong> sul Canal Grande (Piazzale Roma o Ferrovia).',
    veniceIslandsTitle: 'Murano e Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — linee 4.1 / 4.2 dai moli della stazione. <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — linea 12 da Fondamente Nove (~1 ora).',
    veniceWalkTitle: 'A piedi in citt&agrave;',
    veniceWalkBody:
      'Segui i cartelli gialli (il GPS nelle calli spesso sbaglia). <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~15–25 min &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~25–40 min.',
    veniceRialtoTitle: 'Ponte di Rialto',
    veniceRialtoBody: 'A piedi dalla lobby in circa 15–25 minuti lungo i percorsi principali.',
    veniceSanMarcoTitle: 'Piazza San Marco',
    veniceSanMarcoBody: 'Circa 25–40 minuti a piedi, oppure vaporetto linee 1 / 2.',
    venicePdfBtn: 'Scarica la guida completa (PDF)',
    ticketTitle: 'Esenzione contributo di accesso',
    ticketDesc:
      'Come ospite dell&rsquo;<strong style="font-style:italic;">Hotel Canal</strong>, sei legalmente esentato dal pagamento del ticket giornaliero di accesso a Venezia. Registra la presenza per ottenere il QR ufficiale del Comune.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Dati per il sito del Comune</span>Motivo: ospite in struttura ricettiva a Venezia<br>Struttura: Hotel Canal (Santa Croce 553)<br>Riferimento: Stanza ',
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
    doorsTitle: 'Entrance access codes',
    doorsDesc:
      'To enter the hotel at night or when reception is closed, enter the code on the door keypad.',
    doorMainLabel: 'Main entrance',
    doorInnerLabel: 'Inner door',
    routeTitle: 'Walk to the Terrazza',
    routeDesc:
      'About eight minutes from the hotel (Santa Croce 553) to Trattoria alla Terrazza, San Polo 2426. Open Maps too:',
    step1Title: 'Exit and turn left',
    step1Line:
      'Leave the Grand Canal behind you and take Fondamenta dei Tolentini straight away.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'After about seventy metres enter Calle de le Case Nove and continue straight to the little square.',
    step3Title: 'Toward Rio Marin',
    step3Line:
      'From Campiello de le Muneghe continue via Calle Sechera and Corte Canal to Fondamenta Rio Marin.',
    step4Title: 'You have arrived',
    step4Line:
      'Follow Fondamenta Rio Marin: on Calle de l&rsquo;Ogio you will find Trattoria alla Terrazza.',
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
    tastesDesc: 'Fish, pasta and Venetian flavours.',
    veniceTitle: 'Getting around Venice',
    veniceIntro:
      'From reception you are close to Piazzale Roma and the station. On foot, follow the yellow signs (GPS often misleads in the alleys).',
    veniceActvTitle: 'ACTV vaporetto',
    veniceActvBody:
      'Tickets on the AVM Venezia / ACTV app or at official offices; validate before boarding. Lines <strong style="color:#164E5B !important;font-style:italic;">1</strong> and <strong style="color:#164E5B !important;font-style:italic;">2</strong> on the Grand Canal (Piazzale Roma or Ferrovia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — lines 4.1 / 4.2 from the station docks. <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — line 12 from Fondamente Nove (~1 hour).',
    veniceWalkTitle: 'On foot',
    veniceWalkBody:
      'Follow the yellow signs (GPS often misleads in the alleys). <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~15–25 min &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~25–40 min.',
    veniceRialtoTitle: 'Rialto Bridge',
    veniceRialtoBody: 'About 15–25 minutes on foot from the lobby along the main routes.',
    veniceSanMarcoTitle: 'St Mark&rsquo;s Square',
    veniceSanMarcoBody: 'About 25–40 minutes on foot, or vaporetto lines 1 / 2.',
    venicePdfBtn: 'Download the full guide (PDF)',
    ticketTitle: 'Access fee exemption',
    ticketDesc:
      'As a guest of <strong style="font-style:italic;">Hotel Canal</strong>, you are legally exempt from Venice&rsquo;s daily access fee. Register your stay to receive the official municipal QR code.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Details for the municipal website</span>Reason: guest in an accommodation facility in Venice<br>Property: Hotel Canal (Santa Croce 553)<br>Reference: Room ',
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
    doorsTitle: 'Codes d&rsquo;acc&egrave;s',
    doorsDesc:
      'Pour entrer la nuit ou lorsque la r&eacute;ception est ferm&eacute;e, saisissez le code sur le clavier de la porte.',
    doorMainLabel: 'Entr&eacute;e principale',
    doorInnerLabel: 'Porte int&eacute;rieure',
    routeTitle: 'À pied vers la Terrazza',
    routeDesc:
      'Environ huit minutes de l&rsquo;h&ocirc;tel (Santa Croce 553) &agrave; Trattoria alla Terrazza, San Polo 2426. Ouvrez aussi Maps :',
    step1Title: 'Sortez et tournez à gauche',
    step1Line:
      'Laissez le Grand Canal derri&egrave;re vous et prenez aussit&ocirc;t Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Apr&egrave;s environ soixante-dix m&egrave;tres, entrez dans Calle de le Case Nove jusqu&rsquo;au petit square.',
    step3Title: 'Vers Rio Marin',
    step3Line:
      'Du Campiello de le Muneghe, continuez par Calle Sechera et Corte Canal jusqu&rsquo;&agrave; Fondamenta Rio Marin.',
    step4Title: 'Arrivée',
    step4Line:
      'Suivez Fondamenta Rio Marin : Calle de l&rsquo;Ogio m&egrave;ne &agrave; Trattoria alla Terrazza.',
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
    tastesDesc: 'Poisson, pâtes et saveurs vénitiennes.',
    veniceTitle: 'Se d&eacute;placer &agrave; Venise',
    veniceIntro:
      'Depuis la r&eacute;ception, Piazzale Roma et la gare Santa Lucia sont &agrave; quelques minutes. Voici l&rsquo;essentiel ; le guide PDF d&eacute;taille le reste.',
    veniceActvTitle: 'Vaporetto (ACTV)',
    veniceActvBody:
      'Billets sur l&rsquo;appli AVM Venezia / ACTV ou aux guichets ; compostez avant l&rsquo;embarquement. <strong style="color:#164E5B !important;">Lignes 1 et 2</strong> sur le Grand Canal (Piazzale Roma ou Ferrovia).',
    veniceIslandsTitle: 'Murano et Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;">Murano</strong> — lignes 4.1 / 4.2 depuis la gare. <strong style="color:#164E5B !important;">Burano</strong> — ligne 12 depuis Fondamente Nove (~1 h).',
    veniceWalkTitle: 'À pied',
    veniceWalkBody:
      'Suivez les panneaux jaunes (le GPS se trompe souvent). <strong style="color:#164E5B !important;">Rialto</strong> ~15-25 min &middot; <strong style="color:#164E5B !important;">Saint-Marc</strong> ~25-40 min.',
    veniceRialtoTitle: 'Pont du Rialto',
    veniceRialtoBody: 'Environ 15-25 minutes &agrave; pied depuis le hall.',
    veniceSanMarcoTitle: 'Place Saint-Marc',
    veniceSanMarcoBody: 'Environ 25-40 minutes &agrave; pied, ou vaporetto lignes 1 / 2.',
    venicePdfBtn: 'Télécharger le guide complet (PDF)',
    ticketTitle: 'Exemption du ticket d&rsquo;accès à Venise',
    ticketDesc:
      'En tant qu&rsquo;hôte de l&rsquo;<strong>Hotel Canal</strong>, vous êtes totalement exonéré du droit d&rsquo;accès journalier à Venise. Il vous suffit d&rsquo;enregistrer votre séjour pour obtenir le QR Code officiel de la municipalité.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Donn&eacute;es pour le site municipal</span>Motif : client d&rsquo;un &eacute;tablissement d&rsquo;h&eacute;bergement &agrave; Venise<br>Structure : Hotel Canal (Santa Croce 553)<br>R&eacute;f&eacute;rence : Chambre ',
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
    doorsTitle: 'Zugangscodes',
    doorsDesc:
      'Um nachts oder bei geschlossener Rezeption einzutreten, geben Sie den Code auf der Tastatur der T&uuml;r ein.',
    doorMainLabel: 'Haupteingang',
    doorInnerLabel: 'Innent&uuml;r',
    routeTitle: 'Zu Fuß zur Terrazza',
    routeDesc:
      'Etwa acht Minuten vom Hotel (Santa Croce 553) zur Trattoria alla Terrazza, San Polo 2426. Am besten auch Maps &ouml;ffnen:',
    step1Title: 'Hinaus und links abbiegen',
    step1Line:
      'Lassen Sie den Canal Grande hinter sich und nehmen Sie sofort Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Nach etwa siebzig Metern in die Calle de le Case Nove bis zum kleinen Platz.',
    step3Title: 'Richtung Rio Marin',
    step3Line:
      'Vom Campiello de le Muneghe &uuml;ber Calle Sechera und Corte Canal zur Fondamenta Rio Marin.',
    step4Title: 'Ankunft',
    step4Line:
      'Der Fondamenta Rio Marin folgen: in der Calle de l&rsquo;Ogio liegt Trattoria alla Terrazza.',
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
    tastesDesc: 'Fisch, Pasta und venezianische Aromen.',
    veniceTitle: 'Unterwegs in Venedig',
    veniceIntro:
      'Von der Rezeption sind Piazzale Roma und der Bahnhof Santa Lucia nur wenige Minuten entfernt. Hier das Wichtigste; im PDF-Guide finden Sie mehr.',
    veniceActvTitle: 'Vaporetto (ACTV)',
    veniceActvBody:
      'Tickets in der App AVM Venezia / ACTV oder an ACTV-Schaltern; vor dem Einsteigen entwerten. <strong style="color:#164E5B !important;">Linien 1 und 2</strong> am Canal Grande (Piazzale Roma oder Ferrovia).',
    veniceIslandsTitle: 'Murano und Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;">Murano</strong> — Linien 4.1 / 4.2 vom Bahnhof. <strong style="color:#164E5B !important;">Burano</strong> — Linie 12 ab Fondamente Nove (~1 Std.).',
    veniceWalkTitle: 'Zu Fuß',
    veniceWalkBody:
      'Gelben Schildern folgen (GPS irrt oft). <strong style="color:#164E5B !important;">Rialto</strong> ~15-25 Min. &middot; <strong style="color:#164E5B !important;">Markusplatz</strong> ~25-40 Min.',
    veniceRialtoTitle: 'Rialtobrücke',
    veniceRialtoBody: 'Etwa 15-25 Minuten zu Fu&szlig; von der Lobby.',
    veniceSanMarcoTitle: 'Markusplatz',
    veniceSanMarcoBody: 'Etwa 25-40 Minuten zu Fu&szlig; oder Vaporetto Linien 1 / 2.',
    venicePdfBtn: 'Vollständigen Guide herunterladen (PDF)',
    ticketTitle: 'Befreiung von der Venedig-Zutrittsgebühr',
    ticketDesc:
      'Als Gast des <strong>Hotel Canal</strong> sind Sie vollständig von der täglichen Zutrittsgebühr für Venedig befreit. Sie müssen Ihren Aufenthalt nur registrieren, um den offiziellen QR-Code der Stadt zu erhalten.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Angaben f&uuml;r die Stadt-Website</span>Grund: Gast in einer Unterkunft in Venedig<br>Unterkunft: Hotel Canal (Santa Croce 553)<br>Referenz: Zimmer ',
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
    doorsTitle: 'Códigos de acceso',
    doorsDesc:
      'Para entrar de noche o cuando la recepci&oacute;n est&aacute; cerrada, introduzca el c&oacute;digo en el teclado de la puerta.',
    doorMainLabel: 'Entrada principal',
    doorInnerLabel: 'Puerta interior',
    routeTitle: 'A pie a la Terrazza',
    routeDesc:
      'Unos ocho minutos desde el hotel (Santa Croce 553) hasta Trattoria alla Terrazza, San Polo 2426. Abra tambi&eacute;n Maps:',
    step1Title: 'Salga y gire a la izquierda',
    step1Line:
      'Deje el Canal Grande a su espalda y tome enseguida Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Tras unos setenta metros entre en Calle de le Case Nove hasta el campiello.',
    step3Title: 'Hacia Rio Marin',
    step3Line:
      'Desde Campiello de le Muneghe siga por Calle Sechera y Corte Canal hasta Fondamenta Rio Marin.',
    step4Title: 'Llegada',
    step4Line:
      'Siga Fondamenta Rio Marin: en Calle de l&rsquo;Ogio est&aacute; Trattoria alla Terrazza.',
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
    tastesDesc: 'Pescado, pasta y sabores venecianos.',
    veniceTitle: 'Moverse por Venecia',
    veniceIntro:
      'Desde recepci&oacute;n est&aacute; a pocos minutos de Piazzale Roma y la estaci&oacute;n Santa Lucia. Aqu&iacute; lo esencial; la gu&iacute;a PDF tiene m&aacute;s detalle.',
    veniceActvTitle: 'Vaporetto (ACTV)',
    veniceActvBody:
      'Billetes en la app AVM Venezia / ACTV o en taquillas; valide antes de subir. <strong style="color:#164E5B !important;">L&iacute;neas 1 y 2</strong> en el Canal Grande (Piazzale Roma o Ferrovia).',
    veniceIslandsTitle: 'Murano y Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;">Murano</strong> — l&iacute;neas 4.1 / 4.2 desde la estaci&oacute;n. <strong style="color:#164E5B !important;">Burano</strong> — l&iacute;nea 12 desde Fondamente Nove (~1 h).',
    veniceWalkTitle: 'A pie',
    veniceWalkBody:
      'Siga los carteles amarillos (el GPS a menudo falla). <strong style="color:#164E5B !important;">Rialto</strong> ~15-25 min &middot; <strong style="color:#164E5B !important;">San Marcos</strong> ~25-40 min.',
    veniceRialtoTitle: 'Puente de Rialto',
    veniceRialtoBody: 'Unos 15-25 minutos a pie desde el hall.',
    veniceSanMarcoTitle: 'Plaza San Marcos',
    veniceSanMarcoBody: 'Unos 25-40 minutos a pie, o vaporetto l&iacute;neas 1 / 2.',
    venicePdfBtn: 'Descargar la guía completa (PDF)',
    ticketTitle: 'Exención del ticket de acceso a Venecia',
    ticketDesc:
      'Como huésped del <strong>Hotel Canal</strong>, está totalmente exento del pago de la tasa diaria de acceso a Venecia. Solo debe registrar su estancia para obtener el código QR oficial del Ayuntamiento.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Datos para el sitio municipal</span>Motivo: hu&eacute;sped en establecimiento de alojamiento en Venecia<br>Establecimiento: Hotel Canal (Santa Croce 553)<br>Referencia: Habitaci&oacute;n ',
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
