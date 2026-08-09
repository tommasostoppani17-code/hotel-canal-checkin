# HOTEL CANAL — ADVANCED EMAIL ENGINE SPECIFICATION (V4 PRODUCTION)

Documento operativo per Cursor / altre AI. Descrive l’architettura reale del repo (non un redesign da zero che spezza i path esistenti).

---

## 1. Tipologie email e flussi

| Email | Destinatario | Trigger | File sorgente |
| :--- | :--- | :--- | :--- |
| **Welcome ospite** | Email guest dal form | `POST /api/checkins` → `sendWelcomeEmail()` | `server/coupon.js` + `server/welcome-i18n.js` |
| **Report giornaliero Payel** | `REPORT_EMAIL` | Cron 00:00 Europe/Rome / magic `grandcanalhotel` / GitHub Actions | `server/mail.js` + `server/report.js` |
| **Report mensile staff** | `REPORT_EMAIL` | Ultimo giorno mese 23:59 Rome | `server/mail.js` + `server/report.js` |
| **Poster A4** | `REPORT_EMAIL` o `?to=` | `GET /api/send-poster` | `server/poster.js` |

---

## 2. Vincoli tecnici (anti-bug mandate)

1. **Gmail clipping (< ~25–35 KB HTML, payload totale sotto soglia Gmail ~102 KB):** vietato Base64/CID pesanti nel corpo HTML della welcome.
2. **Zero-attachment sulla welcome:** `attachments: []`. Immagini e QR solo via URL su `PUBLIC_URL`.
3. **QR remoto (path reale del codice):**  
   `src="${PUBLIC_URL}/coupon/${token}/qr.png"`  
   *(non `/api/qr/...` — quell’endpoint non esiste nel repo)*
4. **Anti-threading:**
   - Header: `headers: { 'X-Entity-Ref-ID': token }`
   - Subject univoco:
     - se `roomNumber` → `{lp.subject} · {roomNumber}`
     - else se `firstName` → `{lp.subject} · {firstName}`
     - else → `{lp.subject} · {token.slice(0, 6)}`
5. **Hard light-mode:** meta `color-scheme: light` + override `@media (prefers-color-scheme: dark)` con `!important`.
6. **Token HMAC:** `createCouponToken` / `parseCouponToken` in `server/db.js`. Tutti i link coupon consumano quel token.
7. **Niente emoji nei titoli sezione.**
8. **Eccezioni editoriali fisse:**
   - `veniceTitle` = **"Get Around"** in tutte le lingue
   - Porte **Walter** / **Airone** non i18n
   - Walter: forzare `#` finale se manca in env
9. **Brand petroleum unificato email:** `#164E5B` (costante `C` in `coupon.js`). Frontend check-in usa `#124453` — allineare solo se si decide di unificare anche la UI.
10. **Footer legale — P.IVA ufficiale da hotelcanal.com:** **04711930273**.  
    Non usare `02450530274`. Cap. Soc. / REA: includere solo se confermati dal Registro Imprese per *questa* P.IVA (altrimenti omettere).

---

## 3. Env engine

| Env | Uso | Default |
| :--- | :--- | :--- |
| `PUBLIC_URL` | Base assoluta immagini / QR / claim / PDF | `http://localhost:3000` |
| `RESEND_API_KEY` | Provider preferito | se assente → SMTP |
| `SMTP_FROM` | Mittente | `Welcome to Hotel Canal <onboarding@resend.dev>` |
| `WIFI_SSID` | SSID | `hotel canal` |
| `WIFI_PASSWORD` | Password | `''` → mostra `-` |
| `DOOR_CODE_WALTER` | Porta principale | `5358#` (append `#`) |
| `DOOR_CODE_AIRONE` | Porta interna | `532E` |
| `RESTAURANT_MAPS_URL` | Override Maps walking | Google Maps Hotel Canal → Trattoria alla Terrazza |
| `REPORT_EMAIL` | Destinatario report Payel | obbligatorio per report |

---

## 4. Design system (welcome HTML)

### Palette

| Token | Hex | Uso |
| :--- | :--- | :--- |
| Petroleum `C` | `#164E5B` | Brand, bottoni pieni, titoli |
| Soft bg `BOX` | `#E9EEF0` | Badge stanza, chip, half-cards porte |
| White | `#FFFFFF` | Shell + card |
| Line | `#E2E6E8` | Bordi / filetti |
| Brass | `#B79A63` | Sottotitolo brand |
| Text main | `#1D1D1F` | Primario |
| Text muted | `#4A5560` / `#5C6670` / `#8E8E93` / `#AEAEB2` | Gerarchia |
| Warning step 3 | `#C62828` | “NON attraversare il ponte” |

### Tipografia (Google Fonts in `<head>`)

- Brand / titoli solenni: **Cormorant Garamond**
- Corpo / saluti italic: **EB Garamond**
- UI / label / bottoni: **DM Sans**
- Logistica (Get Around, ticket): **Cinzel**

### Shell

- Outer bg `#FFFFFF`, padding `20px 10px`
- Card `max-width: 500px`, `border-radius: 24px`, bordo `1px #E2E6E8`
- Content padding `20px 22px 36px`
- Preheader nascosto: `lp.preheader` / `lp.preheaderNoCoupon` + hash anti-collapse

---

## 5. Asset path (reali sotto `public/`)

| Ruolo | Path URL |
| :--- | :--- |
| Hero | `${PUBLIC_URL}/email/hero-venice.jpg` |
| Terrazza tavolo | `${PUBLIC_URL}/email/postcard-tavolo.jpg` |
| Ingresso | `${PUBLIC_URL}/email/postcard-ingresso.jpg` |
| Dish | `${PUBLIC_URL}/email/postcard-dish.jpg` |
| Thumbs | `${PUBLIC_URL}/email/thumb-*.jpg` |
| Icone | `${PUBLIC_URL}/email/icons/{file}.png` |
| Stickers | `${PUBLIC_URL}/email/stickers/{file}.png` |
| Mask brand | `${PUBLIC_URL}/email/stickers/mask.png` |

---

## 6. Sequenza sezioni welcome (alto → basso)

1. **Preheader** nascosto  
2. **A Hero** — `hero-venice.jpg`, radius 16px  
3. **B Brand** — mask 40px opzionale · `HOTEL CANAL` · `SANTA CROCE 553 · VENEZIA`  
4. **C Saluto** — `greeting(name)` + `welcome` (EB Garamond italic)  
5. **D Badge stanza** — BOX + door icon · `roomLabel` · `roomPrefix` + room/fallback  
6. **E Orari** — calendar · check-in 14:00 / check-out 10:30  
7. **F Wi-Fi** — bricola · card bordo petroleum radius 18px · SSID/password  
8. **G Porte** — due half-cards 50% BOX · **Walter** / **Airone**  
9. **H Percorso** — map icon · postcard ingresso · 4 step (icone gondola/map/bridge/wine) · **step 3 line in `#C62828`** · CTA Maps piena petroleum  
10. **I Coupon branch `includeCoupon`**
    - **true:** discount copy composto · voucher **bordo dashed 1.5px** petroleum radius 28px · foto tavolo · QR remoto · 3 chip (camera/staff/pax)  
    - **false:** claim card · CTA → `${PUBLIC_URL}/coupon/claim/${token}`  
11. **J Tastes** — cloche · thumbs 2×2 · postcard dish  
12. **K Get Around** — titolo fisso “Get Around” · 3 compartimenti ACTV/isole/piedi · outline PDF → `venice-guide.pdf?lang=`  
13. **L Ticket Comune** — esenzione · box `#F4F7F9` · CTA → `https://cda.ve.it`  
14. **M Stickers + wishes + firma**  
15. **N Footer legale** — P.IVA `04711930273` + `legalText` i18n  

### Link dinamici

| Uso | Pattern |
| :--- | :--- |
| Redeem | `${PUBLIC_URL}/coupon/${token}` |
| Claim | `${PUBLIC_URL}/coupon/claim/${token}` |
| QR PNG | `${PUBLIC_URL}/coupon/${token}/qr.png` |
| Guida PDF | `${PUBLIC_URL}/venice-guide.pdf?lang=${lang}` |
| Maps | `RESTAURANT_MAPS_URL` o fallback walking Google |
| Ticket | `https://cda.ve.it` |

---

## 7. Chiavi i18n obbligatorie (`server/welcome-i18n.js`)

Lingue: `it`, `en`, `fr`, `de`, `es`. Stesso set di chiavi in ciascuna.  
`resolveWelcomeLang(lang)` → primi 2 char lower, default `en`.

Chiavi (non ridurre il dizionario a IT/EN soli):

```
subject, htmlTitle, preheader(fn), preheaderNoCoupon,
claimTitle, claimDesc, claimBtn, textClaim,
guestFallback, roomFallback, greeting(fn), welcome,
roomLabel, roomPrefix,
hoursTitle, checkInLabel, checkInValue, checkOutLabel, checkOutValue,
wifiTitle, wifiDesc, networkLabel, passwordLabel,
doorsTitle, doorsDesc,
routeTitle, routeDesc,
step1Title, step1Line, step2Title, step2Line, step3Title, step3Line, step4Title, step4Line,
mapsBtn,
discountTitle, discountBefore, discountBold1, discountMid, discountBold2, discountAfter,
voucherTitle, voucherSub, metaCamera, metaCheckin, metaPax,
tastesTitle, tastesDesc,
veniceTitle, veniceIntro, veniceActvTitle, veniceActvBody,
veniceIslandsTitle, veniceIslandsBody, veniceWalkTitle, veniceWalkBody, venicePdfBtn,
ticketTitle, ticketDesc, ticketBox, ticketBtn,
legalText,
wishes, signatureLine1, signatureLine2,
textIntro, textHours, textRouteHeader, textVoucher, textVenice, textTicket, textSignature
```

**Non rinominare** `discount*` in `privilege*` nel codice live (breaking). Eventuale rename solo con refactor completo FE+BE+i18n.

---

## 8. Report Payel (sintesi)

- Builder: `buildReportEmail` in `server/report.js`
- Subject: `AUDIT RECEPTION - {count} Camere - {dateLabel}`
- CSV allegato **ammesso** sul report (non sulla welcome): BOM `\uFEFF` + riga `sep=,`
- Voucher colonna: `EMESSO` / `NON EMESSO`
- WhatsApp: textarea readonly numeri (copia nativa)
- Nessuna emoji
- Hero remoto: `email/hero-venice.jpg`

---

## 9. File da toccare

```
server/coupon.js          # HTML welcome + sendWelcomeEmail
server/welcome-i18n.js    # copy IT/EN/FR/DE/ES
server/mail.js            # report transport
server/report.js          # HTML/CSV Payel
server/venice-guide.js    # PDF linkato
public/email/**           # asset
EMAIL_SPEC.md             # questo documento
```

---

## 10. Prompt breve per un’altra AI

> Refactor only `server/coupon.js` + `server/welcome-i18n.js` following `EMAIL_SPEC.md`. Keep ESM imports, existing QR path `/coupon/${token}/qr.png`, all five languages, zero welcome attachments, X-Entity-Ref-ID, unique subjects, light-mode lock, Get Around title fixed, Walter/Airone untranslated, VAT 04711930273. Do not invent `/api/qr`. Do not drop tastes/Get Around/ticket sections. Keep HTML table-based for Outlook.

**Stato esecuzione (§10):** applicata su `coupon.js` + `welcome-i18n.js` (Cinzel titoli, claim outline, preheader pad, copy IT/EN luxury, hex `#164E5B` unificato).

---

*Ultimo aggiornamento: allineato al codice live su Render (`hotel-canal-checkin`).*
