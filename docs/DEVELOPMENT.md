# Sviluppo

Requisiti, regole, stack e architettura sono in [AGENTS.md](../AGENTS.md). Rilasci: [RELEASING.md](RELEASING.md).

## Avvio

```bash
npm install
npm run dev
```

`npm run dev` controlla da solo che Electron sia scaricato e, se manca, lo scarica prima di partire. Quando cambiano processo principale o preload l'app si riavvia da sola; l'interfaccia si aggiorna al volo.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | app in sviluppo |
| `npm run typecheck` | controllo dei tipi |
| `npm test` | test del motore delle pause, del badge e del feed della posta |
| `npm run build:mac:local` | .dmg firmato ma non notarizzato in `dist/`, per provarlo sul proprio Mac |
| `npm run build:mac` | .dmg firmato e notarizzato (certificato Developer ID nel Portachiavi e variabili `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) |
| `npm run release` | build firmata e notarizzata pubblicata nelle Release (di solito lo fa GitHub Actions) |
