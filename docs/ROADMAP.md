# Da fare più avanti

Idee e richieste raccolte, da fare con calma (nessuna è in lavorazione).

- **Più lingue**: italiano e inglese per iniziare.
  - Scelta in Impostazioni generali: Automatica (segue la lingua del Mac; se non è italiano, inglese) / Italiano / English, applicata subito senza riavvio.
  - Testi dell'interfaccia già in `src/renderer/src/content.json` (da dividere per lingua); da spostare anche quelli del processo principale (menu, notifiche, finestre di dialogo, aggiornamenti). Date e orari delle pause nella lingua scelta.
  - Novità degli aggiornamenti in tutte e due le lingue (Needo mostra quella giusta). Il README resta in italiano.
- **Sincronizzazione tra Mac con Google Drive** (cartella nascosta "dati dell'app" di Drive, permesso `drive.appdata`: Needo vede solo i suoi file, nessuna verifica di Google richiesta; serve un progetto Google Cloud gratuito con client OAuth "app desktop").
  - Si sincronizzano: account (email, nome, colore, ordine, foto), pause automatiche e pausa manuale, impostazioni generali. Non si sincronizza l'accesso a Gmail: su ogni Mac si fa l'accesso una volta per account.
  - Attivazione: in Impostazioni "Sincronizza con Google Drive" → si apre il browser con la richiesta di Google → Consenti (un account Google qualsiasi, di solito il principale).
  - Primo avvio su un Mac nuovo: nel benvenuto, sotto "Aggiungi il primo account", il pulsante "Hai già Needo su un altro Mac? Ripristina da Google Drive". Gli account compaiono subito nella colonna, sbiaditi, ognuno con "Accedi" (email già compilata).
  - Attivando con account già presenti: Drive vuoto → si caricano questi. Drive con dati → conferma "Su Google Drive ci sono già N account di Needo. Li unisco a quelli di questo Mac?" (Unisci / Annulla); unione per email, per i campi vince l'ultima modifica, ordine di Drive e i nuovi in fondo.
  - Uso normale: ogni modifica arriva agli altri Mac entro pochi secondi, anche se sono aperti. Account aggiunto altrove → compare con "Accedi". Account rimosso → da decidere se sparisce da tutti i Mac o si chiede "solo da questo Mac / da tutti".
- **Caricamento di Gmail più rapido**: in Chrome ~1 secondo, in Needo ~6. Prima misurare (tempi per account in `npm run dev`: inizio, pagina, Gmail pronto), poi intervenire su quello che pesa.
- **Avviso per gli account con la Protezione avanzata di Google**: in Needo non possono accedere (servono passkey o chiave fisica, non disponibili in Electron per i siti di Google).
