# Needo

App per macOS che raccoglie più account Gmail in una finestra, con pausa per account (manuale o programmata) e badge sul Dock che conta solo gli account attivi. Un contenitore leggero e nativo intorno a Gmail originale: nessuna API, nessun server, niente esce dal Mac se non verso Google.

**Installazione:** scarica `Needo-x.y.z.dmg` dalle [Releases](https://github.com/valerioceniccola/needo-mail/releases) e trascinalo in Applicazioni (Mac con chip Apple). Gli aggiornamenti arrivano da soli.

Needo non è affiliato a Google; Gmail è un marchio di Google LLC.

Requisiti, regole, stack e architettura: [AGENTS.md](AGENTS.md).

## Avvio

```bash
npm install
npm run dev
```

`npm run dev` controlla da solo che Electron sia scaricato e, se manca, lo scarica prima di partire.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | app in sviluppo: l'interfaccia si aggiorna al volo, e quando cambiano processo principale o preload l'app si riavvia da sola |
| `npm run typecheck` | controllo dei tipi |
| `npm test` | test del motore delle pause e del badge |
| `npm run build:mac:local` | .dmg firmato col tuo certificato ma non notarizzato: basta per usarla sul tuo Mac |
| `npm run release` | build firmata e notarizzata pubblicata nelle Release (di solito lo fa GitHub Actions: [docs/RELEASING.md](docs/RELEASING.md)) |
| `npm run build:mac` | .dmg firmato e notarizzato (serve il certificato Developer ID nel Portachiavi e le variabili `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) |

## Stato

- [x] Struttura Electron + React + shadcn, tema scuro della tela
- [x] Barra laterale con lista unica, drag and drop, ⌘1–⌘9, menu del tasto destro (pausa / riattiva / rimuovi)
- [x] Motore delle pause e calcolo del badge, con test
- [x] Gmail vero in una vista per account (sessioni separate), indietro / avanti / ricarica
- [x] Aggiunta account (login Google + etichetta e colore), rimozione con pulizia della sessione
- [x] Non letti, badge sul Dock solo per gli account attivi (e scelta per account), notifiche
- [x] Salvataggio su disco di account, ordine e selezione
- [x] Impostazioni dell'account (etichetta, colore, pausa automatica con fasce, rimozione)
- [x] Impostazioni generali (riordino account, badge, notifiche, avvio al login)

Gli account si aggiungono dal + in fondo alla colonna laterale, dalla schermata di benvenuto o da File › Aggiungi account…; le loro impostazioni con tasto destro › Impostazioni…
