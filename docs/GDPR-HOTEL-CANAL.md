# Hotel Canal — Checklist GDPR operativa (da firmare con la direzione)

Documento operativo per allineare **CANAL S.r.l. (Hotel Canal)** e il fornitore tecnico del check-in digitale. Non sostituisce una consulenza legale esterna.

## 1. Ruoli

| Ruolo | Soggetto |
|-------|----------|
| **Titolare del trattamento** | CANAL S.r.l. — Hotel Canal, Santa Croce 553, 30135 Venezia (VE), P.IVA 04711930273 |
| **Fornitore tecnico / eventuale responsabile** | Sviluppatore / manutentore dell’app check-in (contratto di servizi + DPA se richiesto) |
| **Incaricati autorizzati** | Front desk / Payel (o chi riceve i report notturni) — nominati per iscritto dal Titolare |

## 2. Cosa deve firmare l’hotel

1. **Nomina incaricati** (Payel + reception) al trattamento dei dati dei check-in digitali.
2. **Accettazione strumento ufficiale**: il server Render `hotel-canal-checkin` è lo strumento interno di portineria per check-in, coupon e report.
3. **Informativa ospiti** pubblicata in app (`/privacy.html`) e mostrata al consenso.
4. **Eventuale DPA** con hosting (Render), email (Resend/SMTP), WhatsApp Business (Twilio), se richiesti dal consulente privacy.

## 3. Misure tecniche già in prodotto

- Consenso attivo (checkbox non pre-selezionata; blocco invio senza consenso)
- Link / sheet informativa in Step 1
- Cifratura AES-256-GCM di telefono, email, nome at rest (`FIELD_ENCRYPTION_KEY`)
- Retention: dati identificativi fino a checkout + 7 giorni; dopo il report delle 00:00 (Roma) anonimizzazione irreversibile (restano stanza/date/receptionist)
- Backup Gist con payload cifrato (stesso formato DB)
- API guest (Wi‑Fi/porte) solo con token post check-in
- Dashboard staff `/staff`: sessione cookie 12h, telefono/email mascherati, reveal tracciato
- PIN staff: hash scrypt in env (`STAFF_PIN_*`), mai in chiaro su Render

## 4. Cosa resta fuori dal codice (obblighi del Titolare)

- Registro dei trattamenti aggiornato
- Nomine scritte agli incaricati
- Valutazione rischi / DPIA se il consulente la richiede
- Gestione richieste diritti interessati (cancellazione manuale se arriva durante il soggiorno o nei 7 giorni dopo il checkout)

## 5. Contatti

Reception Hotel Canal · info@hotelcanal.com · P.IVA 04711930273
