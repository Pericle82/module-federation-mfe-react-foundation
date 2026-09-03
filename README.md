# Micro-frontend con Webpack Module Federation

POC di architettura a micro-frontend: 5 app React indipendenti orchestrate da un host, che
comunicano fra loro **solo** attraverso un servizio headless (`service_mfe`) che fa da data layer
e da bus eventi.

📖 **[COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)** — la documentazione vera. In particolare:
[com'è cablata la Module Federation](COMPREHENSIVE_GUIDE.md#3-module-federation-comè-implementata) ·
[bus eventi, sottoscrizioni e stato](COMPREHENSIVE_GUIDE.md#5-il-bus-eventi-sottoscrizione-e-interazione-con-lo-stato) ·
[flusso dati](COMPREHENSIVE_GUIDE.md#6-il-flusso-dati-passo-per-passo) ·
[anomalie note](COMPREHENSIVE_GUIDE.md#10-anomalie-note)

## Avvio

```bash
./start_all_mfe.sh          # installa e avvia tutto (log in logs/)
./start_all_mfe.sh --clean  # rimuove prima node_modules e package-lock.json

./check_mfe_endpoints.sh    # health check di tutti gli endpoint
./stop_all_mfe.sh           # stop (--force per SIGKILL)
```

App: **http://localhost:3000**

## Servizi

| Servizio | Porta | Ruolo | Ruolo MF |
|---|---|---|---|
| `container` | 3000 | Orchestra mount/unmount dei remote | host |
| `mfe_1` | 3001 | CRUD items | remote |
| `mfe_2` | 3002 | Filtro items, mostra il loading causato dagli altri MFE | remote |
| `service_mfe` | 3003 | Chiamate HTTP + bus eventi (nessuna UI) | remote |
| `users_mfe` | 3004 | CRUD users | remote |
| `notifications_mfe` | 3005 | Statistiche aggregate e activity feed | remote |
| `mock_json_server` | 4000 | REST finto su `db.json` | — |

## Come sono collegati

Ogni remote espone **un solo modulo**, `./mount`. L'host lo dichiara in `remotes` e lo carica a
runtime scaricando `remoteEntry.js` dalla porta del remote:

```js
// container/webpack.config.js          // mfe_1/webpack.config.js
remotes: {                              exposes: { './mount': './src/mount.tsx' }
  mfe_1: 'mfe_1@http://localhost:3001/remoteEntry.js'
}                                       // → l'host scrive: import('mfe_1/mount')
```

Dettagli — async boundary, share scope, i tre file da tenere allineati nell'host — in
[§ 3 della guida](COMPREHENSIVE_GUIDE.md#3-module-federation-comè-implementata).

## Come comunicano

Nessun micro-frontend importa un altro micro-frontend. Il container monta `service_mfe`, ne
riceve l'oggetto `serviceApi` e lo passa come parametro a tutti gli altri. Ogni MFE legge una
volta in **pull** e poi resta aggiornato in **push**:

```ts
// pull iniziale
useEffect(() => { serviceApi?.fetchItems().then(setItems); }, [serviceApi]);

// push continuo — onDataChange ritorna la unsubscribe, usata come cleanup
useEffect(() => {
  if (!serviceApi?.onDataChange) return;
  return serviceApi.onDataChange('items', setItems);
}, [serviceApi]);
```

Quando `mfe_1` aggiunge un item, `service_mfe` scrive sul backend, ri-legge la lista e la
ridistribuisce sul canale `items`: `mfe_1`, `mfe_2` e `notifications_mfe` si aggiornano insieme.
`notifications_mfe` ripubblica poi le statistiche aggregate sul canale `notifications`, che gli
altri tre mostrano nella propria intestazione — da cui la sincronizzazione bidirezionale.

Canali: `items`, `users`, `notifications` (dati) e `items`, `users` (stato di caricamento).
Meccanica completa — dove vivono i listener, closure e array di dipendenze, cosa attraversa il
bus — in [§ 5 della guida](COMPREHENSIVE_GUIDE.md#5-il-bus-eventi-sottoscrizione-e-interazione-con-lo-stato).

## Stack

React 18 · TypeScript · Webpack 5 Module Federation · styled-components (nei remote) ·
CSS Modules (nel container) · json-server

## Stato

Il flusso end-to-end è verificato e funzionante
([§ 11 della guida](COMPREHENSIVE_GUIDE.md#11-verifica-eseguita)). Restano alcuni difetti noti —
loaders/errori locali non reattivi, React non condiviso fra host e remote, suite di test non
eseguibile, codice morto — elencati con il fix consigliato in
[§ 10](COMPREHENSIVE_GUIDE.md#10-anomalie-note).
