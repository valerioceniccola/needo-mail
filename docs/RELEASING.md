# Rilasciare una nuova versione di Needo

Le versioni escono come **Release** di questa repository. Le app installate controllano all'avvio e ogni 4 ore se ce n'è una nuova, chiedono se scaricarla e propongono di riavviare.

## Rilascio (ogni volta)

1. Alza la versione in `package.json` (es. `0.1.0` → `0.2.0`) e scrivi le novità in `CHANGELOG.md`.
2. Commit e tag con la stessa versione, preceduta da `v`:
   ```bash
   git commit -am "Needo 0.2.0"
   git tag v0.2.0
   git push && git push --tags
   ```
3. GitHub Actions (scheda **Actions**, workflow *Release*) costruisce, firma, notarizza e pubblica. Ci mette circa 10–15 minuti.

In alternativa basta chiedere a Claude "rilascia la 0.2.0": fa lui i passi 1 e 2.

## Configurazione iniziale (una volta sola)

Servono 5 segreti in **GitHub › Settings › Secrets and variables › Actions › New repository secret**.

| Segreto | Cosa contiene | Dove si prende |
|---|---|---|
| `MAC_CERT_P12_BASE64` | il certificato *Developer ID Application* con la sua chiave, in base64 | vedi sotto |
| `MAC_CERT_PASSWORD` | la password scelta esportando il certificato | la scegli tu all'esportazione |
| `APPLE_ID` | l'email del tuo Apple ID sviluppatore | — |
| `APPLE_APP_SPECIFIC_PASSWORD` | una password per app (non la password dell'Apple ID) | account.apple.com › Accesso e sicurezza › Password specifiche per le app |
| `APPLE_TEAM_ID` | il Team ID di 10 caratteri | developer.apple.com › Account › Dettagli abbonamento |

**Il certificato**
1. Se non ce l'hai: Xcode › Impostazioni › Account › il tuo team › *Gestisci certificati* › **+** › *Developer ID Application*.
2. Apri **Accesso Portachiavi** › *Certificati personali*, tasto destro su "Developer ID Application: …" › **Esporta**, formato `.p12`, con una password.
3. Nel Terminale: `base64 -i Certificati.p12 | pbcopy` e incolla il risultato nel segreto `MAC_CERT_P12_BASE64`.
4. Cancella il file `.p12` dalla scrivania.

## Prima installazione per un amico

Dalla pagina **Releases** della repository scarica `Needo-x.y.z.dmg`, aprilo e trascina Needo in Applicazioni. Dalla volta successiva gli aggiornamenti arrivano da soli. Serve un Mac con chip Apple.

## Provare in locale

`npm run build:mac:local` crea l'app firmata ma non notarizzata in `dist/`, senza pubblicare nulla.
