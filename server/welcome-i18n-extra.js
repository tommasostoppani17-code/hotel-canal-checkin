/** Extra welcome-email locales (zh, ja, bn, ar, ru, pl, nl). */
export const WELCOME_I18N_EXTRA = {
  zh: {
    subject: '欢迎来到威尼斯',
    htmlTitle: '欢迎 - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `房间 ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `很高兴您入住，${name}。您 ${room} 号房的门禁密码、高速 Wi-Fi 以及露台欢迎饮品已准备就绪。`
        : `很高兴您入住，${name}。门禁密码、高速 Wi-Fi 以及运河景露台的特别欢迎饮品已准备就绪。`,
    preheaderNoCoupon:
      '很高兴您入住。Wi-Fi、门禁密码与威尼斯指南已为您准备好。',
    claimTitle: '待领取欢迎礼',
    claimDesc:
      '请输入为您服务的工作人员姓名，解锁 Trattoria alla Terrazza 的 10% 折扣券。',
    claimBtn: '领取欢迎礼',
    textClaim: '想要餐厅折扣券？请打开此链接：',
    guestFallback: '客人',
    roomFallback: '待分配',
    greeting: (name) => `亲爱的 ${name}，`,
    welcome:
      '欢迎来到威尼斯。我们很高兴在 Hotel Canal 接待您。下方提供营业时间、Wi-Fi、门禁密码、前往 Terrazza 的步行路线以及欢迎通行凭证。',
    roomLabel: '已分配客房',
    roomPrefix: '房间',
    hoursTitle: '前台营业时间',
    checkInLabel: '入住：',
    checkInValue: '下午 2:00 起',
    checkOutLabel: '退房：',
    checkOutValue: '上午 10:30 前',
    wifiTitle: 'Wi-Fi 连接',
    wifiDesc: '酒店全境提供高速网络。',
    networkLabel: '网络名称 (SSID)',
    passwordLabel: '密码',
    doorsTitle: '入口门禁密码',
    doorsDesc:
      '夜间或前台关闭时进入酒店，请在门锁键盘上输入密码。',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: '步行前往 Terrazza',
    routeDesc:
      '从酒店（Santa Croce 553）步行约八分钟可达 Trattoria alla Terrazza，San Polo 2426。也可打开地图：',
    step1Title: '出门后左转',
    step1Line:
      '背对大运河，立即走上 Fondamenta dei Tolentini。',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      '约七十米后进入 Calle de le Case Nove，一直走到小广场。',
    step3Title: '前往 Rio Marin',
    step3Line:
      '从 Campiello de le Muneghe 经 Calle Sechera 与 Corte Canal 到达 Fondamenta Rio Marin。',
    step4Title: '您已到达',
    step4Line:
      '沿 Fondamenta Rio Marin 前行：在 Calle de l&rsquo;Ogio 即可找到 Trattoria alla Terrazza。',
    mapsBtn: '在 Google 地图中打开',
    discountTitle: '欢迎礼遇',
    discountBefore: '我们为您准备了特别合作优惠：在 ',
    discountBold1: '专属 10% 折扣',
    discountMid: ' 用于 ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ' 的晚餐，房间内所有客人皆可使用。',
    voucherTitle: '10% 折扣券',
    voucherSub: 'HOTEL CANAL 客人合作礼遇',
    metaCamera: '房间',
    metaCheckin: '员工',
    metaPax: '客人',
    tastesTitle: 'Terrazza 风味',
    tastesDesc: '海鲜、意面与威尼斯风味。',
    veniceTitle: '威尼斯出行指南',
    veniceIntro:
      '从前台出发，您靠近 Piazzale Roma 与火车站。步行请跟随黄色指示牌（小巷中 GPS 常会误导）。',
    veniceActvTitle: 'ACTV 水上巴士',
    veniceActvBody:
      '可在 AVM Venezia / ACTV 应用或官方售票处购票；登船前请验证。大运河线路 <strong style="color:#164E5B !important;font-style:italic;">1</strong> 与 <strong style="color:#164E5B !important;font-style:italic;">2</strong>（Piazzale Roma 或 Ferrovia）。',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — 从车站码头乘坐 4.1 / 4.2 路。<strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — 从 Fondamente Nove 乘坐 12 路（约 1 小时）。',
    veniceWalkTitle: '步行',
    veniceWalkBody:
      '跟随黄色指示牌（小巷中 GPS 常会误导）。<strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> 约 15–25 分钟 &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> 约 25–40 分钟。',
    veniceRialtoTitle: '里亚托桥',
    veniceRialtoBody: '从大堂沿主要路线步行约 15–25 分钟。',
    veniceSanMarcoTitle: '圣马可广场',
    veniceSanMarcoBody: '步行约 25–40 分钟，或乘坐水上巴士 1 / 2 路。',
    venicePdfBtn: '下载完整指南（PDF）',
    ticketTitle: '通行费豁免',
    ticketDesc:
      '作为 <strong style="font-style:italic;">Hotel Canal</strong> 的客人，您依法豁免威尼斯每日通行费。请登记住宿以获取官方市政二维码。',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">市政网站所需信息</span>事由：威尼斯住宿设施客人<br>物业：Hotel Canal (Santa Croce 553)<br>参考：房间 ',
    ticketBtn: '申请市政二维码',
    legalText:
      '本邮件由 Hotel Canal 入住系统自动发送。您的个人数据依据欧盟第 2016/679 号条例（GDPR）为与住宿相关的接待目的进行处理。完整隐私声明可在前台或 hotelcanal.com 查阅。',
    wishes: '祝您在威尼斯运河间度过美好旅程。',
    signatureLine1: '管理层 &amp; 员工',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: '欢迎来到威尼斯 - Hotel Canal, Santa Croce 553。',
    textHours: '入住：下午 2:00 起 · 退房：上午 10:30 前',
    textRouteHeader: '步行前往 Trattoria alla Terrazza：',
    textVoucher:
      '10% 折扣券：向服务员出示本邮件中的二维码。',
    textVenice:
      '威尼斯指南：San Marco、Rialto、Casino、Murano、Burano 与交通 - PDF：',
    textTicket:
      '威尼斯通行费豁免（酒店客人）：请在 https://cda.ve.it 登记',
    textSignature: '管理层 - Hotel Canal Venice',
  },
  ja: {
    subject: 'ヴェネツィアへようこそ',
    htmlTitle: 'ようこそ - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `客室 ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `${name}様、ご滞在を心より歓迎いたします。客室 ${room} のアクセスコード、高速Wi-Fi、テラスでのウェルカムトーストをご用意しています。`
        : `${name}様、ご滞在を心より歓迎いたします。アクセスコード、高速Wi-Fi、運河を望むテラスでの特別なウェルカムトーストをご用意しています。`,
    preheaderNoCoupon:
      'ご滞在を心より歓迎いたします。Wi-Fi、ドアコード、ヴェネツィアガイドをご用意しています。',
    claimTitle: '未受取のウェルカムギフト',
    claimDesc:
      'お手伝いしたスタッフの名前を入力して、Trattoria alla Terrazza の10%割引クーポンを解除してください。',
    claimBtn: 'ウェルカムギフトを受け取る',
    textClaim: 'レストラン割引クーポンをご希望ですか？このリンクを開いてください：',
    guestFallback: 'ゲスト',
    roomFallback: '割当待ち',
    greeting: (name) => `${name}様`,
    welcome:
      'ヴェネツィアへようこそ。Hotel Canal でのご滞在を心より歓迎いたします。下記に営業時間、Wi-Fi、ドアコード、Terrazza への徒歩ルート、ウェルカムパスをご案内します。',
    roomLabel: 'ご予約のお部屋',
    roomPrefix: '客室',
    hoursTitle: 'レセプション営業時間',
    checkInLabel: 'チェックイン：',
    checkInValue: '午後2:00以降',
    checkOutLabel: 'チェックアウト：',
    checkOutValue: '午前10:30まで',
    wifiTitle: 'Wi-Fi接続',
    wifiDesc: 'ホテル全館で高速ネットワークをご利用いただけます。',
    networkLabel: 'ネットワーク（SSID）',
    passwordLabel: 'パスワード',
    doorsTitle: 'エントランスアクセスコード',
    doorsDesc:
      '夜間またはレセプション閉店時にホテルへ入るには、ドアのキーパッドにコードを入力してください。',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: 'Terrazza への徒歩ルート',
    routeDesc:
      'ホテル（Santa Croce 553）から Trattoria alla Terrazza（San Polo 2426）まで約8分。地図もご利用ください：',
    step1Title: '出て左折',
    step1Line:
      '大運河を背にして、すぐ Fondamenta dei Tolentini へ進みます。',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      '約70メートル進んだら Calle de le Case Nove に入り、広場まで直進してください。',
    step3Title: 'Rio Marin へ',
    step3Line:
      'Campiello de le Muneghe から Calle Sechera と Corte Canal を通り、Fondamenta Rio Marin へ。',
    step4Title: '到着です',
    step4Line:
      'Fondamenta Rio Marin に沿って進み、Calle de l&rsquo;Ogio で Trattoria alla Terrazza が見つかります。',
    mapsBtn: 'Google マップで開く',
    discountTitle: 'ウェルカム特典',
    discountBefore: '特別な提携をご用意しました：',
    discountBold1: '限定10%割引',
    discountMid: 'が ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ' でのディナーに適用され、お部屋の皆様にご利用いただけます。',
    voucherTitle: '10%割引バウチャー',
    voucherSub: 'HOTEL CANAL ゲスト提携',
    metaCamera: '客室',
    metaCheckin: 'スタッフ',
    metaPax: 'ゲスト',
    tastesTitle: 'Terrazza の味わい',
    tastesDesc: '魚介、パスタ、ヴェネツィアの風味。',
    veniceTitle: 'ヴェネツィアの移動',
    veniceIntro:
      'レセプションから Piazzale Roma と駅は近くです。徒歩では黄色い標識に従ってください（路地ではGPSが誤ることが多いです）。',
    veniceActvTitle: 'ACTV ヴァポレット',
    veniceActvBody:
      'チケットは AVM Venezia / ACTV アプリまたは公式窓口で購入し、乗船前に認証してください。大運河の路線 <strong style="color:#164E5B !important;font-style:italic;">1</strong> と <strong style="color:#164E5B !important;font-style:italic;">2</strong>（Piazzale Roma または Ferrovia）。',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — 駅の桟橋から路線 4.1 / 4.2。<strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — Fondamente Nove から路線 12（約1時間）。',
    veniceWalkTitle: '徒歩',
    veniceWalkBody:
      '黄色い標識に従ってください（路地ではGPSが誤ることが多いです）。<strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> 約15–25分 &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> 約25–40分。',
    veniceRialtoTitle: 'リアルト橋',
    veniceRialtoBody: 'ロビーから主要ルート沿いを徒歩約15–25分。',
    veniceSanMarcoTitle: 'サン・マルコ広場',
    veniceSanMarcoBody: '徒歩約25–40分、またはヴァポレット路線 1 / 2。',
    venicePdfBtn: '完全ガイドをダウンロード（PDF）',
    ticketTitle: '入場料免除',
    ticketDesc:
      '<strong style="font-style:italic;">Hotel Canal</strong> のゲストとして、ヴェネツィアの日次入場料は法令により免除されます。公式市庁QRコードを受け取るには滞在を登録してください。',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">市公式サイト用の詳細</span>理由：ヴェネツィアの宿泊施設のゲスト<br>施設：Hotel Canal (Santa Croce 553)<br>参照：客室 ',
    ticketBtn: '市公式QRを申請',
    legalText:
      'このメールは Hotel Canal のチェックインシステムから自動送信されています。お客様の個人データは、滞在に関連するホスピタリティ目的のため、EU規則2016/679（GDPR）に基づき処理されます。プライバシー通知の全文はフロントまたは hotelcanal.com でご確認ください。',
    wishes: 'ヴェネツィアの運河での素晴らしい旅をお祈りいたします。',
    signatureLine1: 'マネジメント &amp; スタッフ',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'ヴェネツィアへようこそ - Hotel Canal, Santa Croce 553。',
    textHours: 'チェックイン：午後2:00以降 · チェックアウト：午前10:30まで',
    textRouteHeader: 'Trattoria alla Terrazza への徒歩ルート：',
    textVoucher:
      '10%割引バウチャー：このメールのQRをウェイターにお見せください。',
    textVenice:
      'ヴェネツィアガイド：San Marco、Rialto、Casino、Murano、Burano と交通 - PDF：',
    textTicket:
      'ヴェネツィア入場料免除（ホテルゲスト）：https://cda.ve.it で登録',
    textSignature: 'マネジメント - Hotel Canal Venice',
  },
  bn: {
    subject: 'ভেনিসে স্বাগতম',
    htmlTitle: 'স্বাগতম - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `রুম ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `আপনার সঙ্গে থাকতে পেরে আমরা আনন্দিত, ${name}। ${room} নম্বর রুমের অ্যাক্সেস কোড, দ্রুত Wi-Fi এবং টেরেসের স্বাগতম টোস্ট প্রস্তুত।`
        : `আপনার সঙ্গে থাকতে পেরে আমরা আনন্দিত, ${name}। অ্যাক্সেস কোড, দ্রুত Wi-Fi এবং খালের দৃশ্যসহ টেরেসের বিশেষ স্বাগতম টোস্ট প্রস্তুত।`,
    preheaderNoCoupon:
      'আপনার সঙ্গে থাকতে পেরে আমরা আনন্দিত। Wi-Fi, দরজার কোড এবং ভেনিস গাইড অপেক্ষা করছে।',
    claimTitle: 'মুলতুবি স্বাগতম উপহার',
    claimDesc:
      'আপনাকে সহায়তাকারী স্টাফ সদস্যের নাম লিখে Trattoria alla Terrazza-এর ১০% ছাড়ের কুপন আনলক করুন।',
    claimBtn: 'আপনার স্বাগতম উপহার দাবি করুন',
    textClaim: 'রেস্তোরাঁর ছাড়ের কুপন চান? এই লিংক খুলুন:',
    guestFallback: 'অতিথি',
    roomFallback: 'বরাদ্দের অপেক্ষায়',
    greeting: (name) => `প্রিয় ${name},`,
    welcome:
      'ভেনিসে স্বাগতম। Hotel Canal-এ আপনাকে স্বাগত জানাতে পেরে আমরা আনন্দিত। নিচে সময়সূচি, Wi-Fi, দরজার কোড, Terrazza-তে হাঁটার পথ এবং আপনার স্বাগতম পাস পাবেন।',
    roomLabel: 'বরাদ্দকৃত আবাসন',
    roomPrefix: 'রুম',
    hoursTitle: 'রিসেপশন সময়',
    checkInLabel: 'চেক-ইন:',
    checkInValue: 'দুপুর ২:০০ থেকে',
    checkOutLabel: 'চেক-আউট:',
    checkOutValue: 'সকাল ১০:৩০-এর মধ্যে',
    wifiTitle: 'Wi-Fi সংযোগ',
    wifiDesc: 'হোটেলজুড়ে উচ্চগতির নেটওয়ার্ক উপলব্ধ।',
    networkLabel: 'নেটওয়ার্ক (SSID)',
    passwordLabel: 'পাসওয়ার্ড',
    doorsTitle: 'প্রবেশদ্বারের অ্যাক্সেস কোড',
    doorsDesc:
      'রাত্রে বা রিসেপশন বন্ধ থাকলে হোটেলে প্রবেশ করতে দরজার কিপ্যাডে কোড লিখুন।',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: 'Terrazza-তে হাঁটা',
    routeDesc:
      'হোটেল (Santa Croce 553) থেকে Trattoria alla Terrazza, San Polo 2426 পর্যন্ত প্রায় আট মিনিট। মানচিত্রও খুলুন:',
    step1Title: 'বেরিয়ে বাম দিকে ঘুরুন',
    step1Line:
      'গ্র্যান্ড ক্যানাল পেছনে রেখে সোজা Fondamenta dei Tolentini ধরুন।',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'প্রায় সত্তর মিটার পর Calle de le Case Nove-তে ঢুকে ছোট চত্বরে সোজা এগোন।',
    step3Title: 'Rio Marin-এর দিকে',
    step3Line:
      'Campiello de le Muneghe থেকে Calle Sechera ও Corte Canal হয়ে Fondamenta Rio Marin পর্যন্ত যান।',
    step4Title: 'আপনি পৌঁছে গেছেন',
    step4Line:
      'Fondamenta Rio Marin অনুসরণ করুন: Calle de l&rsquo;Ogio-তে Trattoria alla Terrazza পাবেন।',
    mapsBtn: 'Google Maps-এ খুলুন',
    discountTitle: 'স্বাগতম সুবিধা',
    discountBefore: 'আপনার জন্য একটি বিশেষ অংশীদারিত্ব রাখা হয়েছে: একটি ',
    discountBold1: 'এক্সক্লুসিভ ১০% ছাড়',
    discountMid: ' ডিনারের জন্য ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: '-এ, রুমের সবাইয়ের জন্য বৈধ।',
    voucherTitle: '১০% ছাড়ের ভাউচার',
    voucherSub: 'HOTEL CANAL অতিথি অংশীদারিত্ব',
    metaCamera: 'রুম',
    metaCheckin: 'স্টাফ',
    metaPax: 'অতিথি',
    tastesTitle: 'Terrazza-র স্বাদ',
    tastesDesc: 'মাছ, পাস্তা ও ভেনিসীয় স্বাদ।',
    veniceTitle: 'ভেনিসে চলাচল',
    veniceIntro:
      'রিসেপশন থেকে আপনি Piazzale Roma ও স্টেশনের কাছে। পায়ে হেঁটে হলুদ চিহ্ন অনুসরণ করুন (গলিপথে GPS প্রায়ই ভুল দেখায়)।',
    veniceActvTitle: 'ACTV ভ্যাপোরেত্তো',
    veniceActvBody:
      'টিকেট AVM Venezia / ACTV অ্যাপ বা অফিসিয়াল কাউন্টারে; চড়ার আগে যাচাই করুন। গ্র্যান্ড ক্যানালে লাইন <strong style="color:#164E5B !important;font-style:italic;">1</strong> ও <strong style="color:#164E5B !important;font-style:italic;">2</strong> (Piazzale Roma বা Ferrovia)।',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — স্টেশন ডক থেকে লাইন 4.1 / 4.2। <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — Fondamente Nove থেকে লাইন 12 (প্রায় ১ ঘণ্টা)।',
    veniceWalkTitle: 'পায়ে হেঁটে',
    veniceWalkBody:
      'হলুদ চিহ্ন অনুসরণ করুন (গলিপথে GPS প্রায়ই ভুল দেখায়)। <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~১৫–২৫ মিনিট &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~২৫–৪০ মিনিট।',
    veniceRialtoTitle: 'রিয়ালতো সেতু',
    veniceRialtoBody: 'লবি থেকে প্রধান পথে পায়ে হেঁটে প্রায় ১৫–২৫ মিনিট।',
    veniceSanMarcoTitle: 'সেন্ট মার্ক&rsquo;স স্কয়ার',
    veniceSanMarcoBody: 'পায়ে হেঁটে প্রায় ২৫–৪০ মিনিট, অথবা ভ্যাপোরেত্তো লাইন 1 / 2।',
    venicePdfBtn: 'সম্পূর্ণ গাইড ডাউনলোড করুন (PDF)',
    ticketTitle: 'প্রবেশ ফি ছাড়',
    ticketDesc:
      '<strong style="font-style:italic;">Hotel Canal</strong>-এর অতিথি হিসেবে আপনি আইনত ভেনিসের দৈনিক প্রবেশ ফি থেকে অব্যাহতিপ্রাপ্ত। অফিসিয়াল পৌর QR কোড পেতে আপনার অবস্থান নিবন্ধন করুন।',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">পৌর ওয়েবসাইটের জন্য বিবরণ</span>কারণ: ভেনিসের আবাসন সুবিধার অতিথি<br>সম্পত্তি: Hotel Canal (Santa Croce 553)<br>রেফারেন্স: রুম ',
    ticketBtn: 'পৌর QR অনুরোধ করুন',
    legalText:
      'এই ই-মেইল Hotel Canal চেক-ইন সিস্টেম থেকে স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে। আপনার ব্যক্তিগত তথ্য আপনার অবস্থানের সাথে সম্পর্কিত আতিথেয়তার উদ্দেশ্যে EU বিধিমালা 2016/679 (GDPR) অনুযায়ী প্রক্রিয়াকৃত হয়। সম্পূর্ণ গোপনীয়তা নোটিস ডেস্কে বা hotelcanal.com-এ পাওয়া যাবে।',
    wishes: 'ভেনিসের খালের মধ্যে আপনার একটি অসাধারণ যাত্রা কামনা করি।',
    signatureLine1: 'ম্যানেজমেন্ট &amp; স্টাফ',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'ভেনিসে স্বাগতম - Hotel Canal, Santa Croce 553।',
    textHours: 'চেক-ইন: দুপুর ২:০০ থেকে · চেক-আউট: সকাল ১০:৩০-এর মধ্যে',
    textRouteHeader: 'পায়ে হেঁটে Trattoria alla Terrazza-তে পৌঁছানোর উপায়:',
    textVoucher:
      '১০% ছাড়ের ভাউচার: এই ইমেইলের QR ওয়েটারকে দেখান।',
    textVenice:
      'ভেনিস গাইড: San Marco, Rialto, Casino, Murano, Burano ও পরিবহন - PDF:',
    textTicket:
      'ভেনিস প্রবেশ ফি ছাড় (হোটেল অতিথি): https://cda.ve.it-এ নিবন্ধন করুন',
    textSignature: 'ম্যানেজমেন্ট - Hotel Canal Venice',
  },
  ar: {
    subject: 'مرحبًا بكم في البندقية',
    htmlTitle: 'مرحبًا - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `الغرفة ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `يسعدنا استقبالكم، ${name}. رموز الدخول لغرفتكم ${room} وشبكة Wi-Fi السريعة وتحية الترحيب على الشرفة جاهزة.`
        : `يسعدنا استقبالكم، ${name}. رموز الدخول وشبكة Wi-Fi السريعة وتحية ترحيب خاصة على شرفتنا المطلة على القناة جاهزة.`,
    preheaderNoCoupon:
      'يسعدنا استقبالكم. شبكة Wi-Fi ورموز الأبواب ودليل البندقية بانتظاركم.',
    claimTitle: 'هدية الترحيب قيد الانتظار',
    claimDesc:
      'افتحوا قسيمة خصم 10% لدى Trattoria alla Terrazza بإدخال اسم الموظف الذي يساعدكم.',
    claimBtn: 'اطلبوا هدية الترحيب',
    textClaim: 'هل تريدون قسيمة خصم المطعم؟ افتحوا هذا الرابط:',
    guestFallback: 'ضيف',
    roomFallback: 'بانتظار التعيين',
    greeting: (name) => `عزيزي/عزيزتي ${name}،`,
    welcome:
      'مرحبًا بكم في البندقية. يسعدنا استضافتكم في Hotel Canal. أدناه تجدون المواعيد وWi-Fi ورموز الأبواب ومسار المشي إلى Terrazza وتصريح الترحيب.',
    roomLabel: 'الإقامة المخصّصة',
    roomPrefix: 'غرفة',
    hoursTitle: 'ساعات الاستقبال',
    checkInLabel: 'تسجيل الوصول:',
    checkInValue: 'من الساعة 2:00 مساءً',
    checkOutLabel: 'تسجيل المغادرة:',
    checkOutValue: 'بحلول الساعة 10:30 صباحًا',
    wifiTitle: 'اتصال Wi-Fi',
    wifiDesc: 'شبكة عالية السرعة متاحة في جميع أنحاء الفندق.',
    networkLabel: 'الشبكة (SSID)',
    passwordLabel: 'كلمة المرور',
    doorsTitle: 'رموز دخول المدخل',
    doorsDesc:
      'للدخول إلى الفندق ليلًا أو عند إغلاق الاستقبال، أدخلوا الرمز على لوحة مفاتيح الباب.',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: 'المشي إلى Terrazza',
    routeDesc:
      'حوالي ثماني دقائق سيرًا من الفندق (Santa Croce 553) إلى Trattoria alla Terrazza، San Polo 2426. افتحوا الخرائط أيضًا:',
    step1Title: 'اخرجوا واتجهوا يسارًا',
    step1Line:
      'اتركوا القناة الكبرى خلفكم واتخذوا فورًا Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'بعد حوالي سبعين مترًا ادخلوا Calle de le Case Nove واستمروا مستقيمًا حتى الساحة الصغيرة.',
    step3Title: 'نحو Rio Marin',
    step3Line:
      'من Campiello de le Muneghe تابعوا عبر Calle Sechera و Corte Canal حتى Fondamenta Rio Marin.',
    step4Title: 'لقد وصلتم',
    step4Line:
      'اتبعوا Fondamenta Rio Marin: في Calle de l&rsquo;Ogio ستجدون Trattoria alla Terrazza.',
    mapsBtn: 'افتح في Google Maps',
    discountTitle: 'امتياز الترحيب',
    discountBefore: 'حجزنا لكم شراكة خاصة: ',
    discountBold1: 'خصم حصري بنسبة 10%',
    discountMid: ' على العشاء في ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: '، ساري لجميع نزلاء الغرفة.',
    voucherTitle: 'قسيمة خصم 10%',
    voucherSub: 'شراكة ضيوف HOTEL CANAL',
    metaCamera: 'غرفة',
    metaCheckin: 'الموظف',
    metaPax: 'الضيوف',
    tastesTitle: 'نكهات من Terrazza',
    tastesDesc: 'سمك ومعكرونة ونكهات بندقية.',
    veniceTitle: 'التنقل في البندقية',
    veniceIntro:
      'من الاستقبال أنتم قريبون من Piazzale Roma والمحطة. سيرًا على الأقدام اتبعوا اللافتات الصفراء (نظام GPS غالبًا ما يضل في الأزقة).',
    veniceActvTitle: 'قارب ACTV البخاري',
    veniceActvBody:
      'التذاكر عبر تطبيق AVM Venezia / ACTV أو في المكاتب الرسمية؛ تحققوا قبل الصعود. الخطوط <strong style="color:#164E5B !important;font-style:italic;">1</strong> و <strong style="color:#164E5B !important;font-style:italic;">2</strong> على القناة الكبرى (Piazzale Roma أو Ferrovia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — الخطوط 4.1 / 4.2 من أرصفة المحطة. <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — الخط 12 من Fondamente Nove (حوالي ساعة).',
    veniceWalkTitle: 'سيرًا على الأقدام',
    veniceWalkBody:
      'اتبعوا اللافتات الصفراء (نظام GPS غالبًا ما يضل في الأزقة). <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~15–25 دقيقة &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~25–40 دقيقة.',
    veniceRialtoTitle: 'جسر ريالتو',
    veniceRialtoBody: 'حوالي 15–25 دقيقة سيرًا من الردهة على المسارات الرئيسية.',
    veniceSanMarcoTitle: 'ساحة سان ماركو',
    veniceSanMarcoBody: 'حوالي 25–40 دقيقة سيرًا، أو بقارب الخطوط 1 / 2.',
    venicePdfBtn: 'حمّلوا الدليل الكامل (PDF)',
    ticketTitle: 'إعفاء من رسوم الدخول',
    ticketDesc:
      'بصفتكم ضيوفًا في <strong style="font-style:italic;">Hotel Canal</strong>، أنتم معفيون قانونًا من رسوم الدخول اليومية إلى البندقية. سجّلوا إقامتكم للحصول على رمز QR البلدي الرسمي.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">تفاصيل لموقع البلدية</span>السبب: ضيف في منشأة إقامة في البندقية<br>العقار: Hotel Canal (Santa Croce 553)<br>المرجع: الغرفة ',
    ticketBtn: 'اطلبوا QR البلدية',
    legalText:
      'أُرسل هذا البريد الإلكتروني تلقائيًا من نظام تسجيل الوصول في Hotel Canal. تُعالَج بياناتكم الشخصية بموجب لائحة الاتحاد الأوروبي 2016/679 (GDPR) لأغراض الضيافة المرتبطة بإقامتكم. الإشعار الكامل للخصوصية متاح في المكتب أو على hotelcanal.com.',
    wishes: 'نتمنى لكم رحلة رائعة عبر قنوات البندقية.',
    signatureLine1: 'الإدارة &amp; الموظفون',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'مرحبًا بكم في البندقية - Hotel Canal, Santa Croce 553.',
    textHours: 'تسجيل الوصول: من 2:00 مساءً · تسجيل المغادرة: بحلول 10:30 صباحًا',
    textRouteHeader: 'كيفية الوصول سيرًا إلى Trattoria alla Terrazza:',
    textVoucher:
      'قسيمة خصم 10%: أظهروا رمز QR في هذا البريد للنادل.',
    textVenice:
      'دليل البندقية: San Marco، Rialto، Casino، Murano، Burano والنقل - PDF:',
    textTicket:
      'إعفاء رسوم دخول البندقية (ضيف فندق): سجّلوا على https://cda.ve.it',
    textSignature: 'الإدارة - Hotel Canal Venice',
  },
  ru: {
    subject: 'Добро пожаловать в Венецию',
    htmlTitle: 'Добро пожаловать - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `Номер ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `Мы рады приветствовать вас, ${name}. Коды доступа к номеру ${room}, быстрый Wi-Fi и приветственный тост на террасе готовы.`
        : `Мы рады приветствовать вас, ${name}. Коды доступа, быстрый Wi-Fi и особый приветственный тост на террасе с видом на канал готовы.`,
    preheaderNoCoupon:
      'Мы рады приветствовать вас. Wi-Fi, коды дверей и гид по Венеции ждут вас.',
    claimTitle: 'Ожидающий приветственный подарок',
    claimDesc:
      'Разблокируйте купон на скидку 10% в Trattoria alla Terrazza, указав имя сотрудника, который вас сопровождает.',
    claimBtn: 'Получить приветственный подарок',
    textClaim: 'Хотите купон на скидку в ресторане? Откройте эту ссылку:',
    guestFallback: 'Гость',
    roomFallback: 'К назначению',
    greeting: (name) => `Уважаемый(ая) ${name},`,
    welcome:
      'Добро пожаловать в Венецию. Мы рады принять вас в Hotel Canal. Ниже — часы работы, Wi-Fi, коды дверей, маршрут пешком до Terrazza и ваш приветственный пропуск.',
    roomLabel: 'Назначенное размещение',
    roomPrefix: 'НОМЕР',
    hoursTitle: 'Часы работы рецепции',
    checkInLabel: 'Заезд:',
    checkInValue: 'с 14:00',
    checkOutLabel: 'Выезд:',
    checkOutValue: 'до 10:30',
    wifiTitle: 'Подключение Wi-Fi',
    wifiDesc: 'Высокоскоростная сеть доступна по всему отелю.',
    networkLabel: 'Сеть (SSID)',
    passwordLabel: 'Пароль',
    doorsTitle: 'Коды доступа ко входу',
    doorsDesc:
      'Чтобы войти в отель ночью или когда рецепция закрыта, введите код на клавиатуре двери.',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: 'Пешком до Terrazza',
    routeDesc:
      'Около восьми минут от отеля (Santa Croce 553) до Trattoria alla Terrazza, San Polo 2426. Откройте также Карты:',
    step1Title: 'Выйдите и поверните налево',
    step1Line:
      'Оставьте Гранд-канал позади и сразу идите по Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Примерно через семьдесят метров войдите в Calle de le Case Nove и идите прямо до маленькой площади.',
    step3Title: 'К Rio Marin',
    step3Line:
      'От Campiello de le Muneghe продолжайте через Calle Sechera и Corte Canal до Fondamenta Rio Marin.',
    step4Title: 'Вы на месте',
    step4Line:
      'Идите по Fondamenta Rio Marin: на Calle de l&rsquo;Ogio вы найдёте Trattoria alla Terrazza.',
    mapsBtn: 'Открыть в Google Maps',
    discountTitle: 'Приветственная привилегия',
    discountBefore: 'Мы зарезервировали для вас особое партнёрство: ',
    discountBold1: 'эксклюзивная скидка 10%',
    discountMid: ' на ужин в ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ', действующая для всех проживающих в номере.',
    voucherTitle: 'ВАУЧЕР НА СКИДКУ 10%',
    voucherSub: 'ПАРТНЁРСТВО ДЛЯ ГОСТЕЙ HOTEL CANAL',
    metaCamera: 'НОМЕР',
    metaCheckin: 'СОТРУДНИК',
    metaPax: 'ГОСТИ',
    tastesTitle: 'Вкусы Terrazza',
    tastesDesc: 'Рыба, паста и венецианские вкусы.',
    veniceTitle: 'Как передвигаться по Венеции',
    veniceIntro:
      'От рецепции вы рядом с Piazzale Roma и вокзалом. Пешком следуйте жёлтым указателям (GPS в переулках часто вводит в заблуждение).',
    veniceActvTitle: 'Вапоретто ACTV',
    veniceActvBody:
      'Билеты в приложении AVM Venezia / ACTV или в официальных кассах; прокомпостируйте перед посадкой. Линии <strong style="color:#164E5B !important;font-style:italic;">1</strong> и <strong style="color:#164E5B !important;font-style:italic;">2</strong> по Гранд-каналу (Piazzale Roma или Ferrovia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — линии 4.1 / 4.2 от причалов у вокзала. <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — линия 12 от Fondamente Nove (~1 час).',
    veniceWalkTitle: 'Пешком',
    veniceWalkBody:
      'Следуйте жёлтым указателям (GPS в переулках часто вводит в заблуждение). <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~15–25 мин &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~25–40 мин.',
    veniceRialtoTitle: 'Мост Риальто',
    veniceRialtoBody: 'Около 15–25 минут пешком от лобби по основным маршрутам.',
    veniceSanMarcoTitle: 'Площадь Сан-Марко',
    veniceSanMarcoBody: 'Около 25–40 минут пешком или вапоретто линии 1 / 2.',
    venicePdfBtn: 'Скачать полный гид (PDF)',
    ticketTitle: 'Освобождение от входного сбора',
    ticketDesc:
      'Как гость <strong style="font-style:italic;">Hotel Canal</strong>, вы по закону освобождены от ежедневного входного сбора Венеции. Зарегистрируйте пребывание, чтобы получить официальный муниципальный QR-код.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Данные для муниципального сайта</span>Причина: гость средства размещения в Венеции<br>Объект: Hotel Canal (Santa Croce 553)<br>Ссылка: Номер ',
    ticketBtn: 'Запросить муниципальный QR',
    legalText:
      'Это письмо отправлено автоматически системой регистрации Hotel Canal. Ваши персональные данные обрабатываются в соответствии с Регламентом ЕС 2016/679 (GDPR) в целях гостеприимства, связанных с вашим пребыванием. Полное уведомление о конфиденциальности — на стойке или на hotelcanal.com.',
    wishes: 'Желаем вам прекрасного путешествия по каналам Венеции.',
    signatureLine1: 'Администрация &amp; персонал',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'Добро пожаловать в Венецию - Hotel Canal, Santa Croce 553.',
    textHours: 'Заезд: с 14:00 · Выезд: до 10:30',
    textRouteHeader: 'Как дойти пешком до Trattoria alla Terrazza:',
    textVoucher:
      'Ваучер на скидку 10%: покажите QR из этого письма официанту.',
    textVenice:
      'Гид по Венеции: San Marco, Rialto, Casino, Murano, Burano и транспорт - PDF:',
    textTicket:
      'Освобождение от входного сбора Венеции (гость отеля): регистрация на https://cda.ve.it',
    textSignature: 'Администрация - Hotel Canal Venice',
  },
  pl: {
    subject: 'Witamy w Wenecji',
    htmlTitle: 'Witamy - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `Pokój ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `Cieszymy się, że jesteś z nami, ${name}. Kody dostępu do pokoju ${room}, szybkie Wi-Fi i toast powitalny na tarasie są gotowe.`
        : `Cieszymy się, że jesteś z nami, ${name}. Kody dostępu, szybkie Wi-Fi i specjalny toast powitalny na tarasie z widokiem na kanał są gotowe.`,
    preheaderNoCoupon:
      'Cieszymy się, że jesteś z nami. Wi-Fi, kody drzwi i przewodnik po Wenecji czekają.',
    claimTitle: 'Oczekujący prezent powitalny',
    claimDesc:
      'Odblokuj kupon rabatowy 10% do Trattoria alla Terrazza, wpisując imię pracownika, który Ci pomaga.',
    claimBtn: 'Odbierz prezent powitalny',
    textClaim: 'Chcesz kupon rabatowy do restauracji? Otwórz ten link:',
    guestFallback: 'Gość',
    roomFallback: 'Do przydzielenia',
    greeting: (name) => `Szanowny/a ${name},`,
    welcome:
      'Witamy w Wenecji. Z radością gościmy Cię w Hotel Canal. Poniżej znajdziesz godziny, Wi-Fi, kody drzwi, spacer do Terrazza oraz kartę powitalną.',
    roomLabel: 'Przydzielone zakwaterowanie',
    roomPrefix: 'POKÓJ',
    hoursTitle: 'Godziny recepcji',
    checkInLabel: 'Zameldowanie:',
    checkInValue: 'od 14:00',
    checkOutLabel: 'Wymeldowanie:',
    checkOutValue: 'do 10:30',
    wifiTitle: 'Łączność Wi-Fi',
    wifiDesc: 'Szybka sieć dostępna w całym hotelu.',
    networkLabel: 'Sieć (SSID)',
    passwordLabel: 'Hasło',
    doorsTitle: 'Kody dostępu do wejścia',
    doorsDesc:
      'Aby wejść do hotelu w nocy lub gdy recepcja jest zamknięta, wpisz kod na klawiaturze drzwi.',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: 'Spacer do Terrazza',
    routeDesc:
      'Około ośmiu minut od hotelu (Santa Croce 553) do Trattoria alla Terrazza, San Polo 2426. Otwórz też Mapy:',
    step1Title: 'Wyjdź i skręć w lewo',
    step1Line:
      'Zostaw Canal Grande za sobą i od razu wejdź na Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Po około siedemdziesięciu metrach wejdź w Calle de le Case Nove i idź prosto do małego placu.',
    step3Title: 'W stronę Rio Marin',
    step3Line:
      'Z Campiello de le Muneghe kontynuuj przez Calle Sechera i Corte Canal do Fondamenta Rio Marin.',
    step4Title: 'Dotarłeś',
    step4Line:
      'Idź wzdłuż Fondamenta Rio Marin: na Calle de l&rsquo;Ogio znajdziesz Trattoria alla Terrazza.',
    mapsBtn: 'Otwórz w Google Maps',
    discountTitle: 'Przywilej powitalny',
    discountBefore: 'Zarezerwowaliśmy dla Ciebie specjalne partnerstwo: ',
    discountBold1: 'ekskluzywny rabat 10%',
    discountMid: ' na kolację w ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ', ważny dla wszystkich w pokoju.',
    voucherTitle: 'VOUCHER RABATOWY 10%',
    voucherSub: 'PARTNERSTWO DLA GOŚCI HOTEL CANAL',
    metaCamera: 'POKÓJ',
    metaCheckin: 'PERSONEL',
    metaPax: 'GOŚCIE',
    tastesTitle: 'Smaki Terrazza',
    tastesDesc: 'Ryby, pasta i weneckie smaki.',
    veniceTitle: 'Poruszanie się po Wenecji',
    veniceIntro:
      'Od recepcji jesteś blisko Piazzale Roma i dworca. Pieszo podążaj za żółtymi znakami (GPS w zaułkach często myli).',
    veniceActvTitle: 'Vaporetto ACTV',
    veniceActvBody:
      'Bilety w aplikacji AVM Venezia / ACTV lub w oficjalnych kasach; skasuj przed wejściem. Linie <strong style="color:#164E5B !important;font-style:italic;">1</strong> i <strong style="color:#164E5B !important;font-style:italic;">2</strong> na Canal Grande (Piazzale Roma lub Ferrovia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — linie 4.1 / 4.2 z nabrzeży przy dworcu. <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — linia 12 z Fondamente Nove (~1 godzina).',
    veniceWalkTitle: 'Pieszo',
    veniceWalkBody:
      'Podążaj za żółtymi znakami (GPS w zaułkach często myli). <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~15–25 min &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~25–40 min.',
    veniceRialtoTitle: 'Most Rialto',
    veniceRialtoBody: 'Około 15–25 minut pieszo od lobby głównymi trasami.',
    veniceSanMarcoTitle: 'Plac św. Marka',
    veniceSanMarcoBody: 'Około 25–40 minut pieszo lub vaporetto linie 1 / 2.',
    venicePdfBtn: 'Pobierz pełny przewodnik (PDF)',
    ticketTitle: 'Zwolnienie z opłaty wstępu',
    ticketDesc:
      'Jako gość <strong style="font-style:italic;">Hotel Canal</strong> jesteś prawnie zwolniony z dziennej opłaty wstępu do Wenecji. Zarejestruj pobyt, aby otrzymać oficjalny miejski kod QR.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Dane do strony miejskiej</span>Powód: gość obiektu noclegowego w Wenecji<br>Obiekt: Hotel Canal (Santa Croce 553)<br>Numer referencyjny: Pokój ',
    ticketBtn: 'Poproś o miejski QR',
    legalText:
      'Ta wiadomość e-mail została wysłana automatycznie przez system zameldowania Hotel Canal. Twoje dane osobowe są przetwarzane zgodnie z rozporządzeniem UE 2016/679 (RODO) w celach hotelarskich związanych z pobytem. Pełna informacja o prywatności przy recepcji lub na hotelcanal.com.',
    wishes: 'Życzymy wspaniałej podróży wśród kanałów Wenecji.',
    signatureLine1: 'Dyrekcja &amp; Personel',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'Witamy w Wenecji - Hotel Canal, Santa Croce 553.',
    textHours: 'Zameldowanie: od 14:00 · Wymeldowanie: do 10:30',
    textRouteHeader: 'Jak dojść pieszo do Trattoria alla Terrazza:',
    textVoucher:
      'Voucher rabatowy 10%: pokaż kelnerowi QR z tej wiadomości.',
    textVenice:
      'Przewodnik po Wenecji: San Marco, Rialto, Casino, Murano, Burano i transport - PDF:',
    textTicket:
      'Zwolnienie z opłaty wstępu do Wenecji (gość hotelu): zarejestruj na https://cda.ve.it',
    textSignature: 'Dyrekcja - Hotel Canal Venice',
  },
  nl: {
    subject: 'Welkom in Venetië',
    htmlTitle: 'Welkom - Hotel Canal Venice',
    subjectRoom: (room) => (room ? `Kamer ${room}` : ''),
    preheader: (name, room) =>
      room
        ? `We zijn blij u te verwelkomen, ${name}. Uw toegangscodes voor kamer ${room}, snel Wi-Fi en een welkomsttoast op het terras staan klaar.`
        : `We zijn blij u te verwelkomen, ${name}. Uw toegangscodes, snel Wi-Fi en een speciale welkomsttoast op ons terras met kanaalzicht staan klaar.`,
    preheaderNoCoupon:
      'We zijn blij u te verwelkomen. Wi-Fi, deurcodes en uw Venetië-gids wachten.',
    claimTitle: 'Welkomstcadeau in behandeling',
    claimDesc:
      'Ontgrendel uw 10% kortingscoupon voor Trattoria alla Terrazza door de naam in te voeren van de medewerker die u helpt.',
    claimBtn: 'Claim uw welkomstcadeau',
    textClaim: 'Wilt u de restaurantkortingscoupon? Open deze link:',
    guestFallback: 'Gast',
    roomFallback: 'Toe te wijzen',
    greeting: (name) => `Beste ${name},`,
    welcome:
      'Welkom in Venetië. We zijn verheugd u te ontvangen in Hotel Canal. Hieronder vindt u openingstijden, Wi-Fi, deurcodes, de wandeling naar de Terrazza en uw welkomstpas.',
    roomLabel: 'Toegewezen accommodatie',
    roomPrefix: 'KAMER',
    hoursTitle: 'Receptie-uren',
    checkInLabel: 'Check-in:',
    checkInValue: 'vanaf 14:00',
    checkOutLabel: 'Check-out:',
    checkOutValue: 'vóór 10:30',
    wifiTitle: 'Wi-Fi-verbinding',
    wifiDesc: 'Hogesnelheidsnetwerk beschikbaar in het hele hotel.',
    networkLabel: 'Netwerk (SSID)',
    passwordLabel: 'Wachtwoord',
    doorsTitle: 'Toegangscodes entree',
    doorsDesc:
      'Om &rsquo;s nachts of wanneer de receptie gesloten is het hotel binnen te gaan, voert u de code in op het deurpaneel.',
    doorMainLabel: 'Walter',
    doorInnerLabel: 'Airone',
    routeTitle: 'Wandeling naar de Terrazza',
    routeDesc:
      'Ongeveer acht minuten vanaf het hotel (Santa Croce 553) naar Trattoria alla Terrazza, San Polo 2426. Open ook Maps:',
    step1Title: 'Ga naar buiten en sla linksaf',
    step1Line:
      'Laat het Canal Grande achter u en neem meteen Fondamenta dei Tolentini.',
    step2Title: 'Calle de le Case Nove',
    step2Line:
      'Na ongeveer zeventig meter gaat u Calle de le Case Nove in en loopt u rechtdoor naar het kleine plein.',
    step3Title: 'Richting Rio Marin',
    step3Line:
      'Vanaf Campiello de le Muneghe verder via Calle Sechera en Corte Canal naar Fondamenta Rio Marin.',
    step4Title: 'U bent aangekomen',
    step4Line:
      'Volg Fondamenta Rio Marin: in Calle de l&rsquo;Ogio vindt u Trattoria alla Terrazza.',
    mapsBtn: 'Open in Google Maps',
    discountTitle: 'Welkomstprivilege',
    discountBefore: 'We hebben een speciale samenwerking voor u gereserveerd: een ',
    discountBold1: 'exclusieve 10% korting',
    discountMid: ' op het diner bij ',
    discountBold2: 'Trattoria alla Terrazza',
    discountAfter: ', geldig voor iedereen op de kamer.',
    voucherTitle: '10% KORTINGSBON',
    voucherSub: 'HOTEL CANAL GASTPARTNERSCHAP',
    metaCamera: 'KAMER',
    metaCheckin: 'MEDEWERKER',
    metaPax: 'GASTEN',
    tastesTitle: 'Smaken van de Terrazza',
    tastesDesc: 'Vis, pasta en Venetiaanse smaken.',
    veniceTitle: 'Rondkomen in Venetië',
    veniceIntro:
      'Vanaf de receptie bent u dicht bij Piazzale Roma en het station. Te voet volgt u de gele borden (GPS leidt in de steegjes vaak mis).',
    veniceActvTitle: 'ACTV vaporetto',
    veniceActvBody:
      'Tickets via de AVM Venezia / ACTV-app of bij officiële loketten; valideer vóór het instappen. Lijnen <strong style="color:#164E5B !important;font-style:italic;">1</strong> en <strong style="color:#164E5B !important;font-style:italic;">2</strong> op het Canal Grande (Piazzale Roma of Ferrovia).',
    veniceIslandsTitle: 'Murano &amp; Burano',
    veniceIslandsBody:
      '<strong style="color:#164E5B !important;font-style:italic;">Murano</strong> — lijnen 4.1 / 4.2 vanaf de steigers bij het station. <strong style="color:#164E5B !important;font-style:italic;">Burano</strong> — lijn 12 vanaf Fondamente Nove (~1 uur).',
    veniceWalkTitle: 'Te voet',
    veniceWalkBody:
      'Volg de gele borden (GPS leidt in de steegjes vaak mis). <strong style="color:#164E5B !important;font-style:italic;">Rialto</strong> ~15–25 min &middot; <strong style="color:#164E5B !important;font-style:italic;">San Marco</strong> ~25–40 min.',
    veniceRialtoTitle: 'Rialtobrug',
    veniceRialtoBody: 'Ongeveer 15–25 minuten te voet vanaf de lobby langs de hoofdroutes.',
    veniceSanMarcoTitle: 'Piazza San Marco',
    veniceSanMarcoBody: 'Ongeveer 25–40 minuten te voet, of vaporetto lijnen 1 / 2.',
    venicePdfBtn: 'Download de volledige gids (PDF)',
    ticketTitle: 'Vrijstelling toegangsheffing',
    ticketDesc:
      'Als gast van <strong style="font-style:italic;">Hotel Canal</strong> bent u wettelijk vrijgesteld van de dagelijkse toegangsheffing van Venetië. Registreer uw verblijf om de officiële gemeentelijke QR-code te ontvangen.',
    ticketBox:
      '<span style="font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-style:normal;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important;display:block;margin:0 0 10px;">Gegevens voor de gemeentelijke website</span>Reden: gast in een accommodatievoorziening in Venetië<br>Pand: Hotel Canal (Santa Croce 553)<br>Referentie: Kamer ',
    ticketBtn: 'Vraag gemeentelijke QR aan',
    legalText:
      'Deze e-mail is automatisch verzonden door het check-insysteem van Hotel Canal. Uw persoonsgegevens worden verwerkt volgens EU-verordening 2016/679 (AVG) voor hospitality-doeleinden gerelateerd aan uw verblijf. Volledige privacyverklaring aan de balie of op hotelcanal.com.',
    wishes: 'Wij wensen u een prachtige reis door de kanalen van Venetië.',
    signatureLine1: 'Directie &amp; Personeel',
    signatureLine2: 'Hotel Canal Venice',
    textIntro: 'Welkom in Venetië - Hotel Canal, Santa Croce 553.',
    textHours: 'Check-in: vanaf 14:00 · Check-out: vóór 10:30',
    textRouteHeader: 'Hoe u te voet Trattoria alla Terrazza bereikt:',
    textVoucher:
      '10% kortingsbon: toon de QR in deze e-mail aan uw ober.',
    textVenice:
      'Venetië-gids: San Marco, Rialto, Casino, Murano, Burano & transport - PDF:',
    textTicket:
      'Vrijstelling toegangsheffing Venetië (hotelgast): registreer op https://cda.ve.it',
    textSignature: 'De Directie - Hotel Canal Venice',
  },
};
