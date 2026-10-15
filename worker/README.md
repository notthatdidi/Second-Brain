# Tweede brein — pushmeldingen

Kleine Cloudflare Worker die elke dag om 07:00 UTC (±08:00 Nederlandse
tijd) een vaste herinnering stuurt naar iedereen die in de app op het
belletje heeft getikt.

Er wordt geen persoonlijke data (taken, teksten) opgeslagen — alleen het
push-abonnement dat de browser zelf aanmaakt (een technisch adresje om
een melding naartoe te sturen).

## Hoe het werkt

- `src/index.js`
  - `POST /subscribe` — slaat een nieuw push-abonnement op in Cloudflare
    KV (een simpele sleutel/waarde-opslag).
  - `POST /unsubscribe` — verwijdert een abonnement weer.
  - `scheduled` (cron, elke dag) — stuurt de vaste melding naar alle
    opgeslagen abonnementen. Verlopen abonnementen (bv. app verwijderd)
    worden automatisch opgeruimd.

## Opnieuw deployen na een codewijziging

```bash
cd worker
npx wrangler deploy
```

## Belangrijk

- `VAPID_PRIVATE_KEY` staat **alleen** als Cloudflare secret, nooit in
  deze repo. Opnieuw instellen (bv. na het aanmaken van een nieuwe
  Worker): `npx wrangler secret put VAPID_PRIVATE_KEY`.
- De publieke sleutel (`VAPID_PUBLIC_KEY`) staat wél gewoon in
  `wrangler.toml` én in `app.js` — dat is normaal en veilig, die hoeft
  niet geheim te zijn.
