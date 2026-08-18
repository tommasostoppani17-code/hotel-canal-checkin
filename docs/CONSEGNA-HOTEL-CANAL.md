# Hotel Canal — Consegna operativa (check-in + dashboard staff)

Documento per **CANAL S.r.l. / reception**. Aggiornato al deploy con dashboard staff e cifratura PII.

---

## 1. Link (da usare in hotel)

| Cosa | URL | Chi |
|------|-----|-----|
| **Check-in ospiti (QR)** | https://checkin-hotelcanal.it | Ospiti in camera |
| **Dashboard reception** | https://checkin-hotelcanal.it/staff | Solo personale autorizzato |
| Privacy ospiti | https://checkin-hotelcanal.it/privacy.html | Informativa |

**Importante:** non mettere `/staff` su cartelloni pubblici. È protetto da password, ma resta uno strumento interno.

---

## 2. Accesso dashboard staff

1. Apri **https://checkin-hotelcanal.it/staff**
2. Scegli il tuo nome (Tommaso, John, Alejandro, Maria, Mizan, Payel, Sayeed)
3. Inserisci la **password personale** (consegnata dal titolare / IT)

La sessione dura **12 ore**. Poi rifare login.

### Cosa fa la dashboard

- **Clienti** — check-in del giorno, telefono/email mascherati (click per vedere, con registro)
- **Richieste speciali** — note turno
- **Segnalazioni** — blacklist ospiti problematici
- **Manda report contatti** — invio manuale report a Payel (oltre al cron notturno)

---

## 3. Sicurezza dati ospiti (sintesi)

| Misure | Dettaglio |
|--------|-----------|
| Cifratura | Telefono, email e nome **cifrati** nel database |
| HTTPS | Tutto il traffico cifrato in produzione |
| Mascheramento | In lista staff: `+39 ••• ••• ••42`, `m•••@domain.com` |
| Reveal contatti | Solo su click esplicito; azione registrata |
| Retention | Dati identificativi fino a **checkout + 7 giorni**; ogni notte dopo il report delle 00:00 vengono anonimizzati. Restano stanza/date per le statistiche |
| Consenso | Check-in bloccato senza accettazione privacy |
| Report notturno | CSV a email/WhatsApp Payel (canale operativo) |

Documento GDPR completo: `docs/GDPR-HOTEL-CANAL.md`

---

## 4. Configurazione tecnica (Render — solo IT / fornitore)

Variabili già previste su Render (`render.yaml`). **Obbligatorie in produzione:**

- `FIELD_ENCRYPTION_KEY` (≥32 char)
- `GUEST_ACCESS_SECRET`, `CRON_SECRET`, `COUPON_SECRET` (≥24 char, tutti diversi)
- `STAFF_PIN_*` per ogni receptionist (hash scrypt — **nessun PIN di fallback**)
- `TESTER_EMAILS` / `TESTER_PHONES` solo se servono account di prova (mai nomi)
- `RESEND_API_KEY` + `SMTP_FROM` verificato
- `REPORT_EMAIL` (destinazione report)
- `PUBLIC_URL=https://checkin-hotelcanal.it`
- Wi‑Fi / codici porta (`WIFI_*`, `DOOR_CODE_*`)

### Generare password staff (hash)

Sul computer di sviluppo (non committare i PIN):

```bash
node scripts/hash-staff-pin.mjs --roster
```

- La prima parte → variabili `STAFF_PIN_*` su Render
- La seconda parte → PIN in chiaro da consegnare **a voce / foglio nominativo** alla reception

Per un solo PIN:

```bash
node scripts/hash-staff-pin.mjs "PasswordSegreta123"
```

### GitHub Actions (report automatici)

Secret `CRON_SECRET` + variable `PUBLIC_URL` nel repo GitHub (workflow `cron-reports.yml`).

---

## 5. Checklist go-live

- [ ] Deploy Render completato (`/health` → 200)
- [ ] `/api/staff/login-info` → `configured: true`
- [ ] Tutti i `STAFF_PIN_*` impostati su Render (hash)
- [ ] PIN consegnati agli incaricati nominati
- [ ] Test login staff + lista clienti
- [ ] Test check-in ospite end-to-end
- [ ] Report notturno verificato (email o WhatsApp)
- [ ] Backup Gist attivo (opzionale ma consigliato)
- [ ] Nomina scritta incaricati al trattamento (GDPR)

---

## 6. Contatti

- Reception Hotel Canal · info@hotelcanal.com  
- Fornitore tecnico check-in · Tommaso Stoppani  

---

*CANAL S.r.l. — P.IVA 04711930273 — Santa Croce 553, 30135 Venezia*
