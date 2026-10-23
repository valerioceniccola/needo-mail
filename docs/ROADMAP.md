# Da fare più avanti

Idee e richieste raccolte, da fare con calma (nessuna è in lavorazione).

- **Più lingue**: italiano e inglese per iniziare.
  - Scelta in Impostazioni generali: Automatica (segue la lingua del Mac; se non è italiano, inglese) / Italiano / English, applicata subito senza riavvio.
  - Testi dell'interfaccia già in `src/renderer/src/content.json` (da dividere per lingua); da spostare anche quelli del processo principale (menu, notifiche, finestre di dialogo, aggiornamenti). Date e orari delle pause nella lingua scelta.
  - Novità degli aggiornamenti in tutte e due le lingue (Needo mostra quella giusta). Il README resta in italiano.
- **Sincronizzazione tra Mac**: salvare account, etichette, colori, foto e pause su un proprio account, per ritrovarli su un altro Mac.
- **Landing page** di Needo (repo separata `needo-mail-landing`): moderna, pochi contenuti, vantaggi e link di download, in italiano e inglese.
- **Caricamento di Gmail più rapido**: in Chrome ~1 secondo, in Needo ~6. Prima misurare (tempi per account in `npm run dev`: inizio, pagina, Gmail pronto), poi intervenire su quello che pesa.
- **Avviso "trovare i dispositivi sulle reti locali"**: macOS lo mostra per funzioni di Chromium che Needo non usa (ricerca di TV/Chromecast, chiamate Meet). Spegnere la ricerca dei dispositivi; se l'avviso resta, almeno una spiegazione chiara (NSLocalNetworkUsageDescription).
- **Elimina dalla notifica** (da valutare): dentro la casella già aperta (apri l'email, cestino, torna dove eri) oppure, più solido, con le API ufficiali di Gmail (progetto Google Cloud e autorizzazione per account).
- **Avviso per gli account con la Protezione avanzata di Google**: in Needo non possono accedere (servono passkey o chiave fisica, non disponibili in Electron per i siti di Google).
