# Hotel Canal — raccolta numeri (QR → report Payel)

Form mobile Cupertino per reception: telefono + email obbligatori, nome/stanza/receptionist opzionali, consenso privacy. Ogni notte alle **00:00 Europe/Rome** invia un CSV (+ tabella + JSON) alla mail di report. Fine mese: classifica staff.

## Avvio rapido (locale)

```bash
cp .env.example .env
# Compila RESEND_API_KEY e REPORT_EMAIL
npm install
npm start
```

Apri http://localhost:3000

## Deploy gratis su Render

1. Push su GitHub (repo privato ok).
2. Su [render.com](https://render.com) → **New** → **Blueprint** (o Web Service) → collega il repo.
3. Se usi Blueprint, Render legge [`render.yaml`](render.yaml):
   - **Build:** `npm install`
   - **Start:** `npm start` (= `node server/index.js`)
   - **Health check:** `/health`
4. In **Environment** imposta (non committare i segreti):

| Variabile | Esempio |
|-----------|---------|
| `PUBLIC_URL` | `https://hotel-canal-checkin.onrender.com` (il tuo URL Render) |
| `REPORT_EMAIL` | `tommasostoppani17@gmail.com` (test) |
| `RESEND_API_KEY` | `re_…` |
| `SMTP_FROM` | `Hotel Canal Check-in <onboarding@resend.dev>` |
| `CRON_SECRET` | stringa lunga casuale |
| `HOTEL_NAME` | `Hotel Canal` |
| `CRON_TZ` | `Europe/Rome` |
| `DATABASE_PATH` | `./data/checkins.db` |

5. Deploy → attendi che `/health` risponda `{"ok":true,…}`.
6. Aggiorna `PUBLIC_URL` se il nome servizio è diverso, poi in locale:

```bash
PUBLIC_URL=https://TUO-SERVIZIO.onrender.com npm run qr
```

Apri `public/cartello-reception.html` → **Stampa / Salva PDF** (formato A6) per il plexiglass.

**Limiti free:** dopo ~15 min di inattività il servizio va in sleep (primo scan lento). SQLite sul piano free è effimero (si può resettare a ogni redeploy). Ok per demo; per produzione hotel preferisci disco persistente o PC reception sempre acceso.

## Variabili `.env`

| Variabile | Uso |
|-----------|-----|
| `REPORT_EMAIL` | Destinatario report (**test:** `tommasostoppani17@gmail.com` · **prod:** mail hotel / Payel) |
| `RESEND_API_KEY` | Chiave API [resend.com](https://resend.com) |
| `SMTP_FROM` | Mittente (dev: `Hotel Canal Check-in <onboarding@resend.dev>`) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Fallback SMTP classico |
| `CRON_SECRET` | Protegge i trigger manuali report |
| `PUBLIC_URL` | URL pubblico (QR cartello + link coupon email) |
| `DATABASE_PATH` | File SQLite (default `./data/checkins.db`) |

### Resend

1. [resend.com](https://resend.com) → API Keys → crea chiave.
2. In `.env` / Render Env:

```
RESEND_API_KEY=re_xxxxxxxx
SMTP_FROM="Hotel Canal Check-in <onboarding@resend.dev>"
REPORT_EMAIL=tommasostoppani17@gmail.com
```

3. Con `onboarding@resend.dev` Resend invia solo all’email del tuo account Resend.

## QR + cartello reception

```bash
npm run qr
```

Genera:
- `public/qr.png` / `public/qr.svg` — ottanio `#124453`
- `public/cartello-reception.html` — cartello A6 stampabile

## Test report senza aspettare mezzanotte

**Dal form:** `grandcanalhotel` in telefono + nome + stanza, privacy, invia.

**Via API:**

```bash
curl -X POST https://TUO-URL/api/cron/daily-report \
  -H "Authorization: Bearer $CRON_SECRET"
```

## API

- `POST /api/checkins` — `{ phone, email, guestName?, roomNumber?, receptionist?, privacy: true }`
  - Con `receptionist` → coupon 10% Trattoria alla Terrazza via email
- `GET /coupon/:token` — pagina sconto per il ristorante
- `POST /api/cron/daily-report` — Bearer `CRON_SECRET`
- `POST /api/cron/monthly-staff-report` — classifica reception
- `GET /health`

## Go-live hotel

1. Host 24/7 (Render paid / VPS / Mac + tunnel).
2. HTTPS → `PUBLIC_URL` + `npm run qr` + ristampa cartello.
3. `REPORT_EMAIL` produzione + dominio verificato su Resend.
