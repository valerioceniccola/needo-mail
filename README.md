# Gmail Hub

App per macOS che raccoglie più account Gmail in una finestra, con pausa per account (manuale o programmata) e badge sul Dock che conta solo gli account attivi. Uso personale.

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
| `npm run dev` | app in sviluppo, l'interfaccia si aggiorna al volo |
| `npm run typecheck` | controllo dei tipi |
| `npm test` | test del motore delle pause e del badge |
| `npm run build:mac` | .dmg firmato e notarizzato (serve il certificato Developer ID nel Portachiavi e le variabili `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) |

## Stato

- [x] Struttura Electron + React + shadcn, tema scuro della tela
- [x] Barra laterale con lista unica, drag and drop, ⌘1–⌘9, menu del tasto destro (pausa / riattiva / rimuovi)
- [x] Motore delle pause e calcolo del badge, con test
- [x] Gmail vero in una vista per account (sessioni separate), indietro / avanti / ricarica
- [x] Aggiunta account (login Google + etichetta e colore), rimozione con pulizia della sessione
- [x] Non letti, badge sul Dock solo per gli account attivi, notifiche, riepilogo a fine pausa
- [x] Salvataggio su disco di account, ordine e selezione
- [ ] Impostazioni dell'account (etichetta, colore, pausa automatica)
- [ ] Impostazioni generali

Gli account si aggiungono dalla schermata di benvenuto o da File › Aggiungi account…
