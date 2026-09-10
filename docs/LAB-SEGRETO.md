# Lab segreto Riva OS (Hotel Canal live)

Il check-in ospiti su [https://checkin-hotelcanal.it/](https://checkin-hotelcanal.it/) **non si tocca**.

## URL

| Path | Cosa |
|---|---|
| `/lab` | Hub (codice o sessione staff) |
| `/lab?k=…` | Unlock diretto con `RIVA_LAB_SECRET` |
| `/hk` | Housekeeping (dopo unlock) |
| `/colazione` | Colazioni sala |
| `/ospiti` | Area ospiti |
| `/lab/devices` | 20 viewport (iPhone/iPad/desktop) |
| `/staff` | Reception (già in produzione) |

## Setup Render

1. Environment → `RIVA_LAB_SECRET` = codice lungo (es. `openssl rand -hex 16`)
2. `RIVA_LAB_GUARD=1` (default nel blueprint)
3. Deploy. Apri da iPhone: `https://checkin-hotelcanal.it/lab?k=CODICE`

Senza secret in produzione: puoi entrare al hub dopo login su `/staff` (stesso browser).

## Cosa non fare

- Non mettere `/lab` o `/hk` su poster / TripAdvisor / Instagram
- Non usare `/` ospiti per “provare” Riva — quello resta Canal
