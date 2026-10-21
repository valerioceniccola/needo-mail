# Gmail Hub — istruzioni per gli agenti

App desktop per macOS, ad uso personale di Valerio, che raccoglie più account Gmail in una sola finestra. Gmail resta quello **originale** (mail.google.com) caricato in una vista web: l'app non usa le API di Gmail, non legge le email e non manda dati a nessun server.

Design di riferimento: tela "Gmail Hub · stile Linear" (claude.ai/artifact/Penwq5ubz8skU5YCCVZsnB). Quando una scelta qui e la tela non coincidono, vale questo file.

---

## 1. Funzionalità e regole

### Account
- Ogni account ha una **sessione separata** (cookie e login propri, persistenti): `session.fromPartition('persist:account-<id>')`.
- Ogni account ha **etichetta** e **colore** (palette fissa: `#5E9CF2 #F2994A #4CB782 #B37FEB #E86C8E #4DB6C4 #8A8B93`).
- Aggiunta in due passi: 1) login Google dentro l'app, 2) etichetta + colore. Il nuovo account va in fondo alla lista.
- Si aggiunge dal + in fondo alla colonna laterale, da File › Aggiungi account… o dalla schermata di benvenuto (primo avvio).

### Barra laterale
- **Colonna minimale** larga 92 px, stile Slack: in alto i semafori, poi **un avatar per account** (foto profilo Google letta dalla pagina di Gmail; mentre si legge un loader, se non arriva le iniziali sul colore dell'account). Niente nome dell'app, niente etichette: nome e colore stanno nell'intestazione.
- Avatar: bordo sottile nel colore dell'account; quello aperto ha una barretta bianca a sinistra e il bordo più spesso; non letti in un pallino rosso (oltre 99: "99+").
- **Una sola lista**, nessuna sezione "Attivi / In pausa". Un account in pausa resta al suo posto: avatar grigio e trasparente, icona di pausa sopra, nessun numero.
- Passando col mouse: suggerimento nativo (`title`) con etichetta e scorciatoia, es. "Lavoro · ⌘2" (un tooltip HTML finirebbe sotto la vista Gmail).
- Ordine modificabile con **drag and drop** (nella colonna e nelle Impostazioni).
- In fondo: **+** per aggiungere un account, sotto l'icona delle **Impostazioni**.

### Scorciatoie
- Le scorciatoie **non si assegnano**: dipendono solo dalla posizione. ⌘1 = primo account dall'alto, ⌘2 = secondo, … fino a ⌘9. Cambiando l'ordine cambiano i numeri.
- Valgono anche per gli account in pausa (aprirli non li riattiva).

### Selettore di account di Gmail
- Nascosto via CSS (`views.ts`, `HIDE_ACCOUNT_SWITCHER`): ogni account ha già la sua vista, non servono due modi di cambiare account. Bloccate anche le pagine Google `AddSession` / `AccountChooser` / `SignOutOptions` fuori dall'aggiunta.

### Navigazione
- In alto a sinistra: **indietro, avanti, ricarica** sulla vista Gmail dell'account aperto. Accanto: colore, etichetta / email dell'account.

### Pausa
- **Tasto destro** su un account → menu con: *Metti in pausa* (o *Riattiva* se è in pausa), *Impostazioni…*, *Rimuovi account*.
- La pausa manuale è immediata e dura **finché non la togli** (nessuna durata da scegliere).
- **Pausa automatica** (tasto destro → Impostazioni, `AccountSettingsDialog`): interruttore + una o più fasce (accendendo senza fasce se ne propone una: lun–ven 19:00–09:00). In fondo al dialog lo stato calcolato sulle fasce non ancora salvate ("Adesso attivo · va in pausa alle 19:00"). Fasce senza giorni non si salvano. Ogni fascia = giorni della settimana + orario "dalle–alle" (può scavalcare la mezzanotte, es. 19:00–09:00) oppure "tutto il giorno".
- Precedenza: se metti in pausa a mano, l'account resta in pausa finché non lo riattivi tu, anche se la fascia automatica finisce.
- Un account in pausa: **nessuna notifica**, **non conta nel badge**. Gmail resta visibile e usabile; sopra compare una fascia "In pausa · … · Riattiva" con fino a quando dura la pausa automatica, se c'è.
- Quando un account torna attivo: **una sola notifica di riepilogo** ("Newsletter: 48 non letti"), non tutte quelle arretrate (disattivabile nelle Impostazioni).

### Badge e notifiche
- Badge sull'icona del Dock = somma dei non letti della **Posta in arrivo** dei soli account **attivi**. Nessun account attivo → nessun badge.
- Notifiche native di macOS create dall'app leggendo il feed Atom della posta (email nuove rispetto all'ultimo controllo), titolo "Etichetta · Mittente", testo = oggetto; più di 3 insieme → una sola "N nuove email". Clic o pulsante **Apri** → apre l'account e quell'email. Pulsante **Elimina** → sposta la conversazione nel Cestino (come "Elimina" di Gmail), aprendola in una finestra nascosta e premendo il pulsante di Gmail (`mailActions.ts`). I pulsanti macOS li mostra solo con app firmata e stile "Avvisi" (`NSUserNotificationAlertStyle: alert` in `electron-builder.yml`). Le notifiche desktop di Gmail vengono assorbite dal preload (sarebbero doppie e ignorerebbero la pausa). In sviluppo macOS le mostra a nome di "Electron"; nell'app impacchettata a nome di Gmail Hub.

### Impostazioni generali
Elenco account (riordinabile, stato, ⌘n, menu "…", "Aggiungi account"), poi interruttori: badge sul Dock, notifiche, riepilogo a fine pausa, icona nella barra dei menu (spenta di default), apri all'accensione del Mac.

---

## 2. Stack

Base: lo stack personale "Nebula" di Valerio, adattato a Electron.

| Parte | Scelta | Perché |
|---|---|---|
| Contenitore | **Electron** (ultima stabile) | Gmail in vista web, accesso a Dock, notifiche, avvio al login |
| Build e dev | **electron-vite** | Vite per l'interfaccia con aggiornamento al volo; riavvio automatico del processo principale |
| Interfaccia | **React + TypeScript** | Base Nebula |
| UI | **shadcn/ui** (Radix) + **Tailwind CSS** | Componenti accessibili pronti (menu contestuale, dialog, switch) nello stile Linear |
| Icone | **lucide-react** | Base Nebula |
| Animazioni | **motion** | Base Nebula, usato con parsimonia |
| Stato interfaccia | **zustand** | Base Nebula |
| Drag and drop | **@dnd-kit/core** + **@dnd-kit/sortable** | Riordino della lista account |
| Date e orari | **dayjs** (locale italiano) | Calcolo delle fasce di pausa |
| Dati salvati | file JSON in `userData` (`src/main/store.ts`) | Account, ordine, fasce, preferenze, finestra. Niente electron-store: dalla v10 è solo ESM e il processo principale è CommonJS |
| Test | **vitest** | Solo la logica importante: motore delle pause, calcolo del badge |
| Pacchetto | **electron-builder** | .dmg firmato e notarizzato con l'account Apple Developer di Valerio |

Versioni: Electron 44, electron-vite 5, Vite 7, TypeScript 6, vitest 4, React 19, Tailwind 4. Volutamente non le ultimissime uscite (Electron 45 ed electron-vite 6 erano appena uscite allo scaffold). `.npmrc` imposta `legacy-peer-deps=true` per un errore di npm 10 sui peer opzionali di vite/vitest.

Alias: `@/` → `src/renderer/src` (serve a shadcn), `@shared/` → `src/shared`. I componenti shadcn si aggiungono con `npx shadcn add <nome>` (vedi `components.json`).

Dalla base Nebula restano React + TypeScript, zustand, lucide-react, motion e dayjs. Restano fuori:
- `react-router-dom`: c'è una sola finestra, le "pagine" (principale, benvenuto, aggiunta account, impostazioni) sono stati in zustand;
- `axios` e TanStack Query: nessuna API da chiamare;
- `react-hook-form`: i form sono minuscoli (etichetta, colore, fasce), bastano input controllati;
- `sonner`: le conferme passano dalle notifiche di sistema; si aggiunge solo se serve davvero.

---

## 3. Architettura

```
Processo principale (Node)
├── AccountManager    crea/rimuove una WebContentsView per account, ognuna con la sua session partition
├── PauseEngine       ogni minuto calcola chi è attivo (pausa manuale + fasce) → stato per account
├── Unread            non letti dal feed Atom di Gmail (session.fetch con i cookie dell'account), riletti 1,5 s dopo ogni cambio del titolo e ogni minuto; il titolo serve solo da ripiego
├── Notifier          notifiche native; tace per gli account in pausa; riepilogo al rientro
├── Badge             app.dock.setBadge() con la somma degli account attivi
├── Store             JSON in ~/Library/Application Support/Gmail Hub/ (store.ts)
└── WindowState       ricorda posizione e dimensioni della finestra (windowState.ts)

Preload Gmail (iniettato in ogni vista Gmail)
└── sostituisce window.Notification di Gmail con una versione muta (le notifiche le crea il principale dal feed)

Preload app + Renderer (React)
└── barra laterale, intestazione, menu contestuale, dialog, impostazioni; parla col principale via IPC tipizzato (contextBridge)
```

Punti delicati:
- **Menu del tasto destro nativo** (`Menu.popup`): un menu HTML finirebbe sotto la vista Gmail, che sta sopra la pagina. Per lo stesso motivo, con un dialog aperto l'interfaccia chiama `coverGmail()` (store.ts): il principale scatta un'istantanea della vista (`capturePage`), la nasconde, e l'interfaccia mostra l'istantanea al suo posto sotto il dialog, così Gmail non sembra sparire.
- **Scorciatoie ⌘1…⌘9 nel menu dell'app** (`menu.ts`), non nell'interfaccia: così funzionano anche col cursore dentro Gmail.
- **Chiudere la finestra la nasconde** (macOS): le viste restano vive per non letti e notifiche; ⌘Q chiude davvero.
- **Preload in sandbox**: non possono importare altri file del progetto. `preload/gmail.ts` non importa nulla da `shared/` (altrimenti Rollup crea un file condiviso tra i due preload che la sandbox non sa caricare).
- **Notifiche**: non dipendono dalle impostazioni di Gmail; per controllare i permessi di macOS c'è Vista › Invia una notifica di prova.
- **User agent**: NON travestirlo. Si lascia quello di Electron (come fa Meru). Uno user agent di Chrome (o Firefox) sopra i segnali di Chromium incorporato fa scattare il blocco di Google "Questo browser o questa app potrebbero non essere sicuri". L'aggiunta di un account parte da `accounts.google.com/ServiceLogin?service=mail`.
- **Memoria**: le viste degli account non visibili restano caricate (servono per notifiche e conteggi); valutare di sospendere solo gli account in pausa.
- **Link esterni**: i link fuori da Google si aprono nel browser predefinito (`shell.openExternal`), quelli di Google restano nella vista.
- Finestra: `titleBarStyle: 'hiddenInset'`, semafori nella barra laterale, barra laterale scura.

---

## 4. Struttura del progetto

```
src/
  main/            processo principale (AccountManager, PauseEngine, UnreadTracker, Notifier, Badge, Store, ipc.ts)
  preload/
    app.ts         ponte IPC per l'interfaccia
    gmail.ts       script iniettato nelle viste Gmail
  renderer/src/
    components/
      ui/          componenti shadcn (generati, non modificarli a mano se non serve)
      atoms/       Text, Kbd, ColorDot, …
      molecules/   AccountRow, PauseRuleEditor, …
      organisms/   Sidebar, TopBar, PausedBanner, AccountSettingsDialog, …
    pages/         Main, Welcome, AddAccount, Settings
    app/           store zustand, hook (useAccounts, useShortcuts)
    lib/           funzioni senza interfaccia
    content.json   testi in italiano mostrati all'utente
  shared/          tipi e funzioni usati da main e renderer (Account, PauseRule, isPaused(), …)
```

Il motore delle pause (`shared/pause.ts`) è fatto di funzioni pure (`isPaused`, `scheduledPauseEndsAt`), testate in `shared/pause.test.ts`. La scelta manuale è `Account.override`: `{ state: 'paused' }` (in pausa finché non la togli) oppure `{ state: 'active', until }` (riattivato a mano durante una pausa automatica, fino alla fine della fascia in corso).

Fasce che scavalcano la mezzanotte: la parte del mattino appartiene al giorno dopo. Con "lun–ven 19:00–09:00" la domenica sera non è coperta: per averla serve spuntare anche la domenica.

---

## 5. Stile (dalla tela)

- Cornice dell'app **scura** stile Linear; Gmail dentro resta com'è (di solito chiaro), in un riquadro con angoli 10 px staccato di 8 px.
- Font **Inter**, testo interfaccia 13 px.
- Colori: sfondo `#0E0E10`, barra laterale `#121215`, bordi `#1F1F23` / `#26262B`, testo `#EDEDEF`, secondario `#9A9BA3`, terziario `#8A8B93`, riga selezionata `#222228`, accento `#5E6AD2`.
- Angoli 6 px (righe, pulsanti), 8 px (menu), 12 px (dialog). Bordi da 1 px, ombre solo su menu e dialog.
- Fascia "In pausa": sfondo `#18182A`, bordo `#2A2A44`.
- I token vanno nel tema di Tailwind / variabili CSS di shadcn, non scritti a mano nei componenti.

---

## 6. Convenzioni (da Nebula)

- **Codice in inglese** (file, componenti, variabili, tipi, chiavi), **commenti in italiano** che spiegano il perché, **testi per l'utente in italiano** in `content.json`.
- Design atomico, un componente per cartella, export default, JSDoc di una riga sopra ogni componente.
- TypeScript leggero: tipi per dati e props, niente generics inutili.
- Semplicità prima di tutto: niente astrazioni "per il futuro".

## 7. Comandi

- `npm run dev` — avvio in sviluppo con aggiornamento al volo
- `npm run typecheck` — controllo dei tipi (main + renderer)
- `npm test` — vitest
- `npm run build:mac` — .dmg firmato e notarizzato
- `npm run build:mac:local` — .dmg firmato ma non notarizzato, per provarlo sul proprio Mac

Prima di consegnare una modifica: `npm run typecheck` e `npm test` senza errori.
