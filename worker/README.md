# PayPal-Credits-Backend

Dieses Backend ist für den Credits-Shop des 3D Flight Simulators gedacht.

## Secrets in Cloudflare
Als Worker-Secrets setzen:
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET

Die Secrets gehören nicht ins GitHub-Repository.

## D1
Eine Cloudflare-D1-Datenbank anlegen und deren ID in `worker/wrangler.jsonc` eintragen. Danach `worker/schema.sql` ausführen.

## API
- POST /api/create-order
- POST /api/capture-order
- GET /api/balance?player=...

Die Paketpreise und Credit-Mengen werden serverseitig festgelegt.

## Deployment
Den Worker über Cloudflare deployen und anschließend seine URL in `index.html` bei `PAYMENT_API_URL` eintragen.

PayPal-Webhooks können zusätzlich eingerichtet werden, um spätere Zahlungsereignisse wie Rückerstattungen zu verarbeiten.
