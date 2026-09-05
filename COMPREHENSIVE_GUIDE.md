# Guida tecnica — Micro-frontend con Webpack Module Federation

Questa guida descrive **come funziona realmente** il progetto: come è cablata la Module
Federation, come un micro-frontend si sottoscrive al bus eventi e come quegli eventi
interagiscono con il suo stato React, il flusso dei dati e i limiti noti.
Tutto ciò che segue è stato verificato eseguendo il sistema (vedi § 10).

**Indice**

1. [L'idea di base](#1-lidea-di-base) · 2. [Servizi e porte](#2-servizi-e-porte) ·
3. [Module Federation: com'è implementata](#3-module-federation-comè-implementata) ·
4. [Le interfacce](#4-le-interfacce) ·
5. [Il bus eventi: sottoscrizione e stato](#5-il-bus-eventi-sottoscrizione-e-interazione-con-lo-stato) ·
6. [Il flusso dati passo per passo](#6-il-flusso-dati-passo-per-passo) ·
7. [Ciclo di vita del mount](#7-ciclo-di-vita-del-mount-lato-container) ·
8. [Cosa è condiviso](#8-isolamento-cosa-è-condiviso-e-cosa-no) ·
9. [Avvio e diagnosi](#9-avvio-arresto-diagnosi) · 10. [Anomalie](#10-anomalie-note) ·
11. [Verifica](#11-verifica-eseguita) · 12. [Aggiungere un MFE](#12-aggiungere-un-nuovo-micro-frontend) ·
**[Appendice A: drill-down dei concetti difficili](#appendice-a-drill-down-dei-concetti-difficili)**

> **Se è la prima volta che tocchi Module Federation**, leggi prima l'[Appendice A](#appendice-a-drill-down-dei-concetti-difficili).
> Spiega da zero i dodici concetti su cui poggia tutto il resto — moduli e istanze, closure,
> share scope, async boundary, publish/subscribe, `useEffect` e stale closure — ognuno con il
> problema che risolve e il punto del progetto in cui compare. Le sezioni tecniche rimandano
> alla voce corrispondente con la sigla **→ A.n**.

---

## 1. L'idea di base

Ci sono 5 applicazioni React indipendenti + 1 host + 1 backend finto.
Nessun micro-frontend importa un altro micro-frontend. Ognuno espone **una sola funzione**,
`mount()`, e comunica con gli altri **solo** attraverso un oggetto API che gli viene passato
come argomento — l'API di `service_mfe`.

```
                      ┌──────────────────────────────────────────────┐
                      │  container :3000  (host, React #1)           │
                      │  bootstrap.tsx  ─ tiene serviceApi + isReady │
                      └───┬───────────────────────┬──────────────────┘
                          │ mount({el})           │ mount({el, serviceApi})
                          ▼                       ▼
            ┌──────────────────────┐   ┌───────────────────────────────────────┐
            │ service_mfe :3003    │   │ notifications_mfe :3005  (React #2)   │
            │ (headless, React #2) │   │ mfe_1 :3001   Items CRUD              │
            │                      │   │ mfe_2 :3002   Items filter            │
            │ • chiamate HTTP      │   │ users_mfe :3004  Users CRUD           │
            │ • bus eventi         │   └───────────────────────────────────────┘
            └──────────┬───────────┘             ▲
                       │ fetch/POST/DELETE       │ onDataChange / onLoadingChange
                       ▼                         │ notifyDataChange
            ┌──────────────────────┐             │
            │ json-server :4000    │─────────────┘
            │ /items  /users       │
            └──────────────────────┘
```

Punto chiave: **`service_mfe` non ha UI**. Il container lo monta su un `<div style="display:none">`
e ne usa solo il valore di ritorno. È al tempo stesso *data layer* (parla con il backend) e
*message bus* (registri di listener a livello di modulo).

---

## 2. Servizi e porte

| Servizio | Porta | Ruolo | Ruolo MF | Espone |
|---|---|---|---|---|
| `container` | 3000 | Orchestratore del ciclo di vita | **host** | — |
| `mfe_1` | 3001 | CRUD items | remote | `./mount` |
| `mfe_2` | 3002 | Filtro items + loading altrui | remote | `./mount` |
| `service_mfe` | 3003 | API HTTP + bus eventi | remote | `./mount` |
| `users_mfe` | 3004 | CRUD users | remote | `./mount` |
| `notifications_mfe` | 3005 | Statistiche + activity feed | remote | `./mount` |
| `mock_json_server` | 4000 | REST finto su `db.json` | — | — |

> `store_mfe` (Redux) **non esiste più**: rimosso nel commit `9e19118`.

---

## 3. Module Federation: com'è implementata

### 3.1 I due lati della configurazione

Un solo host, cinque remote. Nessuno dei due lati usa entrambi i ruoli.
*Se non è chiaro che problema risolva tutto questo, parti da → [A.4](#a4-che-problema-risolve-module-federation).*

**Host** — [container/webpack.config.js](container/webpack.config.js):

```js
new ModuleFederationPlugin({
  name: 'container',
  remotes: {
    mfe_1:             'mfe_1@http://localhost:3001/remoteEntry.js',
    mfe_2:             'mfe_2@http://localhost:3002/remoteEntry.js',
    service_mfe:       'service_mfe@http://localhost:3003/remoteEntry.js',
    users_mfe:         'users_mfe@http://localhost:3004/remoteEntry.js',
    notifications_mfe: 'notifications_mfe@http://localhost:3005/remoteEntry.js',
  },
  // NB: nessun `exposes`, nessun `shared` — vedi § 8
})
```

Come si legge una riga di `remotes`:

```
  mfe_1   :   'mfe_1        @  http://localhost:3001/remoteEntry.js'
   │             │                        │
   │             │                        └─ URL da cui scaricare l'entry del remote
   │             └─ `name` dichiarato dal remote → diventa la global `window.mfe_1`
   └─ prefisso usato negli import dell'host:  import('mfe_1/mount')
```

**Remote** — es. [mfe_1/webpack.config.js](mfe_1/webpack.config.js):

```js
new ModuleFederationPlugin({
  name: 'mfe_1',                              // → window.mfe_1
  filename: 'remoteEntry.js',                 // → http://localhost:3001/remoteEntry.js
  exposes: { './mount': './src/mount.tsx' },  // → import('mfe_1/mount')
  shared: {
    react:       { singleton: true, eager: false, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, eager: false, requiredVersion: '^18.2.0' },
  },
})
```

La chiave di `exposes` si concatena al prefisso del remote: `'./mount'` diventa
`mfe_1/mount`. È l'unico modulo pubblico di ogni remote — tutto il resto
(`useItems.ts`, `components.ts`, `theme.ts`) resta privato e non è raggiungibile dall'host.

L'output di ogni remote ha `publicPath: 'auto'` (→ [A.15](#a15-publicpath-auto)). È obbligatorio: senza, i chunk secondari di
`mfe_1` verrebbero cercati su `localhost:3000` (l'origine della pagina) invece che su
`localhost:3001`. Con `auto`, webpack ricava il path a runtime dall'URL dello script già
caricato. Verificato nel waterfall: ogni remote scarica i propri chunk dalla propria porta.

### 3.2 L'async boundary (perché `index.ts` fa un `import()` dinamico)

```ts
// container/src/index.ts — l'intero entry point è questo
import('./bootstrap').then(...)
```

Non è uno stile: è un **requisito** di Module Federation (spiegazione da zero: → [A.7](#a7-lasync-boundary-e-il-tick)).
Prima che venga valutato qualunque
modulo condiviso, il runtime deve inizializzare lo *share scope* e chiamare `init()` sui
container remoti. Un `import` statico di `./bootstrap` verrebbe valutato nello stesso tick
dell'entry, prima che l'inizializzazione sia finita, e i moduli `shared` non risolverebbero.

Il `import()` dinamico spezza l'entry in due chunk (`main.js` + `src_bootstrap_tsx.js`) e
inserisce l'inizializzazione in mezzo. Nel waterfall reale si vede esattamente questo:

```
GET :3000/                                  ← index.html (HtmlWebpackPlugin)
GET :3000/main.js                           ← runtime + init dello share scope
GET :3000/src_bootstrap_tsx.js              ← l'app vera, dopo l'async boundary
GET :3003/remoteEntry.js                    ← primo remote richiesto (service_mfe)
GET :3001..3005/remoteEntry.js              ← gli altri quattro, in parallelo
GET :3003/src_mount_tsx-...bundle.js        ← il modulo esposto + le sue dipendenze
```

### 3.3 Cosa succede a runtime su `import('mfe_1/mount')`

Webpack non lascia quell'import così com'è: lo sostituisce con una sequenza del runtime MF.
Cosa siano *container object* e *factory*: → [A.5](#a5-remoteentryjs-container-object-factory).

```
1.  <script src="http://localhost:3001/remoteEntry.js">   ← inserito nel <head>
2.  lo script definisce  window.mfe_1 = { get, init }     ← il "container object" del remote
3.  window.mfe_1.init(shareScope)                          ← negoziazione delle dipendenze
4.  const factory = await window.mfe_1.get('./mount')      ← risolve la chiave di `exposes`
5.  const module = factory()                               ← { mount, unmount }
```

Verificato in pagina a sistema avviato:

```js
window.mfe_1                        // → { get: ƒ, init: ƒ }
await window.mfe_1.get('./mount')   // → ƒ () (factory)
Object.keys(factory())              // → ['mount', 'unmount']
window.container                    // → undefined  (l'host non ha `exposes`)
```

Il passo 1 usa un tag `<script>`, non `fetch`: per questo il sistema funziona anche se
`mfe_1`, `mfe_2` e `service_mfe` non mandano header CORS (§ 10.4).

Se il remote non risponde, il passo 1 fallisce e `import()` viene rigettato. È il caso gestito
dal retry di `useMicrofrontend` (§ 7): 5 tentativi ogni 2 s, che è ciò che rende tollerabile un
ordine di avvio imperfetto.

### 3.4 I tre punti da toccare nell'host

L'host non "scopre" i remote: li conosce staticamente, in **tre file distinti** che vanno tenuti
allineati a mano.

| File | Cosa contiene | Cosa succede se manca |
|---|---|---|
| [webpack.config.js](container/webpack.config.js) | voce in `remotes` | `Module not found` in build |
| [moduleLoader.ts](container/src/mfe/hooks/moduleLoader.ts) | `() => import('mfe_1/mount')` | `Unknown microfrontend module` a runtime |
| [remotes.d.ts](container/src/types/remotes.d.ts) | `declare module 'mfe_1/mount'` | errore TypeScript, build ok (babel non typecheck) |

**Perché `moduleLoader.ts` esiste.** Webpack deve poter analizzare staticamente ogni import
federato per generare il codice del passo 3.3. Un `import(nomeVariabile)` non è analizzabile e
fallirebbe. Il file risolve il problema con una mappa di funzioni letterali:

```ts
const moduleLoaders = {
  'mfe_1/mount': () => import(/* webpackChunkName: "mfe_1" */ 'mfe_1/mount'),
  'mfe_2/mount': () => import(/* webpackChunkName: "mfe_2" */ 'mfe_2/mount'),
  // ...
} as const;

export type MicrofrontendModuleName = keyof typeof moduleLoaders;  // union letterale
```

Gli import restano letterali (webpack contento), ma `useMicrofrontend` può accettare il nome
come stringa e il tipo `MicrofrontendModuleName` impedisce di passarne una non registrata.

### 3.5 Lo share scope

→ Meccanismo spiegato da zero in [A.6](#a6-share-scope-e-singleton); perché due React sono un problema, in [A.3](#a3-perché-due-react-sono-un-problema).

Ogni remote dichiara `react` e `react-dom` come `singleton`. Il meccanismo: l'host crea un
oggetto share scope, lo passa a ogni `remote.init(scope)`, e ogni remote vi **registra** la
propria copia e vi **consuma** la versione vincente. Con `singleton: true` la versione vincente
è una sola per tutti.

In questo progetto l'host dichiara `remotes` ma **non** `shared`: non contribuisce nulla allo
scope e non consuma nulla da esso. Risultato misurato (le chiavi `__reactContainer$<id>` che
react-dom scrive sui nodi DOM identificano l'istanza):

```
#root                      → __reactContainer$gkae1icwrj     ← React del container
i 4 div dei remote         → __reactContainer$nvorwjtjqe     ← React condiviso fra i 5 remote
```

Due istanze di React: una dell'host, una condivisa da tutti i remote (che negoziano fra loro
attraverso lo scope creato dall'host). Conseguenze e rimedio in § 8.

Nota di incoerenza: `notifications_mfe` dichiara `eager: true` sui suoi `shared` e vi include
anche `styled-components`, mentre gli altri usano `eager: false` e non condividono
`styled-components`.

---

## 4. Le interfacce

### 4.1 Contratto di mount (identico per tutti i remote)

```ts
// <remote>/src/mount.tsx
export function mount(options: { el: HTMLElement; serviceApi?: ServiceMfeApi }): {
  unmount: () => void;
  updateProps?: (props: { serviceApi?: ServiceMfeApi }) => void; // solo mfe_2
};
```

`service_mfe` è l'unica eccezione sul valore di ritorno: `mount({ el })` restituisce
l'intera `ServiceMfeApi` invece di un semplice handle.

Perché una funzione che riceve un nodo DOM e non un componente React: → [A.12](#a12-perché-mount-e-non-un-componente-react).

Le dichiarazioni TypeScript stanno in [remotes.d.ts](container/src/types/remotes.d.ts): è
l'unico punto in cui il container "conosce" i remote a compile-time, e va tenuto allineato a
mano con i `mount.tsx` dei remote — non c'è generazione automatica.

### 4.2 `ServiceMfeApi` — l'unico canale fra micro-frontend

Definita in [service_mfe/src/mount.tsx](service_mfe/src/mount.tsx#L6-L46).

```ts
interface ServiceMfeApi {
  // Dati (attraversano la rete)
  fetchItems():  Promise<any[]>;   fetchUsers():  Promise<any[]>;
  filterItems(q: string): Promise<any[]>;   filterUsers(q: string): Promise<any[]>;
  addItem(name):    Promise<any[]>;   addUser(name):    Promise<any[]>;
  removeItem(id):   Promise<any[]>;   removeUser(id):   Promise<any[]>;

  // Bus eventi (in-memory, nessuna rete)
  onDataChange<T>(ch: 'items'|'users'|'notifications', cb: (data: T) => void): () => void;
  notifyDataChange(ch: 'items'|'users'|'notifications', data: any): void;
  onLoadingChange(ch: 'items'|'users', cb: (loading: boolean, op?: string) => void): () => void;

  // Snapshot di stato — NON reattivi, vedi § 10.1
  readonly loaders: Record<string, boolean>;
  readonly errors:  Record<string, string | null>;

  unmount(): void;
}
```

`mount()` deve restituire l'API **in modo sincrono**, ma gli handler vivono dentro un componente
React che si monta in modo asincrono. La soluzione: `mount()` ritorna subito un oggetto di
*facciata*; ogni metodo fa `const api = await apiReady; return api.fetchItems()`, dove `apiReady`
è una Promise risolta dal `useEffect` del componente interno. Chi chiama non se ne accorge.
Dettaglio del meccanismo: → [A.13](#a13-la-facciata-sincrona-su-unapi-asincrona).

---

## 5. Il bus eventi: sottoscrizione e interazione con lo stato

Questa è la parte che tiene insieme tutto. Riassunto in una frase: **ogni MFE possiede il proprio
stato React, lo popola una volta in pull e poi lo mantiene aggiornato in push, sottoscrivendo un
canale del bus dentro un `useEffect` che ritorna la funzione di unsubscribe come cleanup.**

*Prerequisiti, se servono:* [A.8 publish/subscribe](#a8-publishsubscribe-il-pattern-del-bus) ·
[A.9 `useEffect` e cleanup](#a9-useeffect-quando-gira-e-perché-esiste-il-cleanup) ·
[A.2 closure](#a2-closure).

### 5.1 Dove vivono i listener

In [service_mfe/src/mount.tsx](service_mfe/src/mount.tsx), a **livello di modulo** — fuori da
React, fuori da qualunque componente:

```ts
const dataChangeListeners = {
  items:         new Set<(data: any[]) => void>(),
  users:         new Set<(data: any[]) => void>(),
  notifications: new Set<(data: any)   => void>(),
};

const loadingChangeListeners = {
  items: new Set<(isLoading: boolean, operation?: string) => void>(),
  users: new Set<(isLoading: boolean, operation?: string) => void>(),
};
```

Perché "livello di modulo" implichi "uno solo per tutta la pagina": → [A.1](#a1-modulo-istanza-riferimento).

Tre conseguenze, tutte importanti:

1. **Sono singleton di modulo.** Webpack valuta `mount.tsx` una volta sola e ne mette in cache il
   namespace. Chiunque ottenga il modulo — anche montandolo una seconda volta — parla con gli
   **stessi** `Set`. Verificato: recuperando il modulo dal container remoto e montandolo su un
   `<div>` scollegato, la sonda ha ricevuto gli eventi generati dall'interazione con la UI di
   `mfe_1`:

   ```js
   const mod = (await window.service_mfe.get('./mount'))();
   const api2 = mod.mount({ el: document.createElement('div') });   // seconda facciata
   api2.onDataChange('items', console.log);
   // → click su "Add Item" in mfe_1 → il listener si attiva
   ```

2. **Sopravvivono ai render.** Non essendo stato React, non vengono ricreati quando il componente
   interno di `service_mfe` renderizza.

3. **Non vengono ripuliti allo smontaggio di `service_mfe`.** Se il servizio fosse smontato e
   rimontato mentre gli MFE restano vivi, i listener vecchi resterebbero nei `Set`. Oggi non
   accade perché `Service_Mfe.tsx` monta con `useEffect(..., [])`, una volta sola.

`Set` — non array — perché la deduplicazione e la rimozione in `O(1)` rendono banale
l'unsubscribe: `listeners.delete(callback)`.

### 5.2 Il pattern di sottoscrizione

È identico in tutti e quattro gli MFE. Sei righe, con quattro decisioni dentro
(se `useEffect`, cleanup e array di dipendenze non sono terreno noto: → [A.9](#a9-useeffect-quando-gira-e-perché-esiste-il-cleanup)):

```ts
// mfe_1/src/useItems.ts
useEffect(() => {
  if (!serviceApi?.onDataChange) return;                    // (a) guardia

  const unsubscribe = serviceApi.onDataChange(              // (b) canale + callback
    'items',
    (updatedItems: any[]) => setItems(updatedItems)         // (c) push → stato React
  );

  return unsubscribe;                                       // (d) cleanup automatico
}, [serviceApi]);                                           // (e) dipendenze
```

- **(a)** `serviceApi` può essere `undefined`: il container lo passa come prop e all'inizio vale
  `null`. La guardia evita di sottoscrivere prima che il servizio sia pronto.
- **(b)** `onDataChange` fa una cosa sola: `dataChangeListeners['items'].add(callback)`.
- **(c)** la callback **non** è React: è una funzione qualunque chiamata da `service_mfe`. Il
  ponte verso React è la `setItems` catturata nella closure, che schedula un re-render.
- **(d)** `onDataChange` **restituisce la funzione di unsubscribe**
  (`() => listeners.delete(callback)`). Ritornandola direttamente dal `useEffect`, React la
  chiama allo smontaggio: nessuna riga di cleanup da scrivere, nessun listener orfano.
- **(e)** l'array di dipendenze decide **quando** la sottoscrizione viene rifatta. È il punto
  delicato: vedi § 5.5.

### 5.3 Chi ascolta cosa

| MFE | Canali dati | Canale loading | Stato locale che viene aggiornato |
|---|---|---|---|
| `mfe_1` | `items`, `notifications` | — | `items`, `notificationStats` |
| `mfe_2` | `items`, `notifications` | `items` | `items`, `filteredItems`, `notificationStats`, `externalLoading`, `loadingOperation` |
| `users_mfe` | `users`, `notifications` | — | `users`, `notificationStats` |
| `notifications_mfe` | `items`, `users` | — | `stats`, `activities` |

Chi pubblica: `service_mfe` su `items`/`users` (dopo una scrittura) e sui canali loading;
`notifications_mfe` su `notifications` (broadcast puro, senza rete).

Nessuno sottoscrive `loadingChangeListeners.users`: il canale esiste ma è a vuoto (§ 10.7).

### 5.4 Come i due flussi popolano lo stesso stato

Ogni MFE ha **due** `useEffect` che scrivono nella stessa variabile di stato, con ruoli diversi:

```ts
const [items, setItems] = useState<any[]>([]);

// PULL — una tantum, all'arrivo di serviceApi
useEffect(() => {
  if (serviceApi?.fetchItems) serviceApi.fetchItems().then(setItems);
}, [serviceApi]);

// PUSH — continuo, per ogni scrittura fatta da chiunque
useEffect(() => {
  if (!serviceApi?.onDataChange) return;
  return serviceApi.onDataChange('items', setItems);
}, [serviceApi]);
```

| | Pull | Push |
|---|---|---|
| Quando | al mount, quando `serviceApi` diventa disponibile | a ogni scrittura riuscita, da qualunque MFE |
| Chi lo innesca | l'MFE stesso | `service_mfe`, dopo la ri-lettura dal backend |
| Rete | sì (`GET`) | no (l'array è già in memoria) |
| Effetto | riempie lo stato iniziale | lo rimpiazza per intero |

Da qui una regola che spiega un dettaglio che sorprende: dopo `await serviceApi.addItem(x)`,
`mfe_1` **non usa il valore di ritorno** e non tocca `items`. Aspetta l'evento.

```ts
const handleAdd = useCallback(async () => {
  if (!newItem.trim() || !serviceApi?.addItem) return;
  await serviceApi.addItem(newItem);
  setNewItem("");                  // svuota solo l'input
  // items arriverà da onDataChange
}, [newItem, serviceApi]);
```

È deliberato: l'unica sorgente di verità è il backend, e tutti gli ascoltatori ricevono lo stesso
array nello stesso istante. Chi ha scritto non è privilegiato rispetto a chi guarda. Il costo è
una `GET` in più per scrittura e nessun aggiornamento ottimistico.

### 5.5 Il punto delicato: closure e array di dipendenze

→ Il concetto per intero, con i tre rimedi, in [A.10 stale closure](#a10-stale-closure-dove-a2-incontra-a9).

La callback è creata **una volta** al momento della sottoscrizione e **congela** tutto ciò che
legge dallo scope del componente. Se legge uno stato, quello stato deve stare nelle dipendenze,
altrimenti la callback continuerà a vedere il valore vecchio per sempre.

`mfe_2` è il caso da studiare. La sua callback non fa solo `setItems`: deve **ri-applicare il
filtro attivo** ai dati nuovi, quindi legge `currentFilter`.

```ts
// mfe_2/src/useItemsFilter.ts
useEffect(() => {
  if (!serviceApi?.onDataChange) return;

  const unsubscribe = serviceApi.onDataChange('items', (updatedItems: any[]) => {
    setItems(updatedItems);

    if (!currentFilter) {                        // ← legge stato del componente
      setFilteredItems(updatedItems);
    } else {
      setFilteredItems(updatedItems.filter(i =>
        i.name?.toLowerCase().includes(currentFilter.toLowerCase())
      ));
    }
  });

  return unsubscribe;
}, [serviceApi, currentFilter]);                 // ← per questo currentFilter è qui
```

Con `currentFilter` nelle dipendenze, ogni volta che il filtro cambia React esegue il cleanup
(rimuove il vecchio listener dal `Set`), rilancia l'effetto e registra una callback nuova con la
closure aggiornata. Senza, dopo aver applicato un filtro, ogni evento successivo lo
ignorerebbe — un classico stale closure.

Alternativa, se il ping-pong di sottoscrizioni desse fastidio: tenere `currentFilter` in una
`useRef` aggiornata a ogni render, leggere `currentFilterRef.current` dentro la callback e
lasciare `[serviceApi]` come unica dipendenza.

Verificato a runtime: applicato il filtro `"Prova"` (1 risultato) e poi rimosso un item da
`mfe_1`, `mfe_2` è rimasto su `Current: Prova • Total: 1 items` — la callback aveva il filtro
corrente, non quello di quando era stata registrata.

Lo stesso schema in `notifications_mfe` è invece **sbagliato** (§ 10.7): la callback legge
`stats.totalUsers` per decidere se l'attività sia un'aggiunta o una rimozione, e `stats` è nelle
dipendenze — quindi l'effetto ri-sottoscrive a ogni statistica che cambia, e il confronto usa
comunque un valore già superato. La forma corretta sarebbe l'updater funzionale, che
`notifications_mfe` usa correttamente due righe sopra per lo stato ma non per l'attività:

```ts
setStats(prev => ({ ...prev, totalUsers: updatedUsers.length }));   // ok, non serve nelle deps
```

### 5.6 Cosa attraversa il bus, esattamente

La notifica è un ciclo `for` sincrono su un `Set`:

```ts
const listeners = dataChangeListeners[dataType];
listeners.forEach(cb => { try { cb(latestData); } catch (e) { console.error(e); } });
```

Tre proprietà misurate, da conoscere:

- **Tutti i sottoscrittori ricevono lo stesso riferimento all'array** (→ [A.1](#a1-modulo-istanza-riferimento)). Con due sonde registrate
  sul canale `items`, `a === b` è risultato `true`. Nessuno deve mutare il payload: un `.sort()`
  o uno `.splice()` in un MFE corromperebbe gli altri. Se serve riordinare, copiare prima.
- **L'ordine è quello di registrazione** (`Set` preserva l'ordine di inserimento), quindi dipende
  dall'ordine di mount dei remote. Non farci affidamento.
- **Un listener che lancia non blocca gli altri**: il `try/catch` per singola callback isola i
  guasti. È la ragione per cui un MFE rotto non porta giù la sincronizzazione degli altri.

### 5.7 Il canale `loading`: stesso meccanismo, uso diverso

`onLoadingChange` funziona identicamente, ma il payload non sono dati: è
`(isLoading: boolean, operation?: string)`. Serve a un MFE per mostrare che **un altro** MFE sta
scrivendo. `mfe_2` lo usa così:

```ts
useEffect(() => {
  if (!serviceApi?.onLoadingChange) return;
  return serviceApi.onLoadingChange('items', (isLoading, operation) => {
    setExternalLoading(isLoading);
    setLoadingOperation(operation || "");
  });
}, [serviceApi]);
```

Sequenza esatta registrata da una sonda durante un "add item" partito da `mfe_1`:

```
addItem:true  →  dataSync:true  →  dataSync:false  →  addItem:false
```

Le due coppie sono annidate: quella esterna copre l'intera operazione, quella interna la sola
ri-lettura. `mfe_2` traduce `operation` in un messaggio (`'addItem'` → "➕ Adding new item…",
`'dataSync'` → "🔄 Syncing data…") e disabilita i propri pulsanti finché `externalLoading` è vero.

Questo è **l'unico** meccanismo di loading che funziona nel progetto. I banner locali di `mfe_1` e
`users_mfe` leggono invece `serviceApi.loaders`, che è uno snapshot senza sottoscrizione, quindi
non compaiono mai: § 10.1.

### 5.8 Il rimbalzo: da consumatore a produttore

`notifications_mfe` chiude il cerchio. Ascolta `items` e `users`, aggrega, e **ripubblica** il
risultato su un terzo canale con `notifyDataChange` — una pubblicazione puramente in memoria, che
non passa da `service_mfe.fetch*` né dalla rete:

```ts
// notifications_mfe/src/useNotifications.ts
const broadcastStats = useCallback(() => {
  if (!serviceApi?.notifyDataChange) return;
  serviceApi.notifyDataChange('notifications', {
    stats,
    lastActivity: activities[0]?.timestamp ?? null,
    totalActivity: activities.length,
  });
}, [serviceApi, stats, activities]);

useEffect(() => { broadcastStats(); }, [broadcastStats]);   // ripubblica a ogni cambio
```

Gli altri tre MFE lo ricevono come un canale qualsiasi e lo mettono nel proprio stato:

```ts
// in mfe_1, mfe_2, users_mfe
useEffect(() => {
  if (!serviceApi?.onDataChange) return;
  return serviceApi.onDataChange('notifications', setNotificationStats);
}, [serviceApi]);
```

→ header di `mfe_1`/`mfe_2`: "👥 Users: 8"; header di `users_mfe`: "📊 Items: 4".

Non c'è ciclo infinito perché `notifications_mfe` non sottoscrive il canale che pubblica, e i tre
riceventi non ripubblicano nulla. È l'unica garanzia contro i loop: il bus non ne offre
alcuna, quindi va verificata a mano ogni volta che si aggiunge un produttore.

---

## 6. Il flusso dati passo per passo

### 6.1 Avvio

```
1. container/src/index.ts        →  import('./bootstrap')   [async boundary, § 3.2]
2. bootstrap.tsx renderizza <App>:  serviceApi = null, isReady = false
3. <Service_Mfe> monta subito:  await import('service_mfe/mount') → mount({el: hiddenDiv})
      └─ ritorna la facciata sincrona (§ 4.2)
4. onApiReady(api) → setServiceApi(api) + setIsReady(true)   [un solo re-render, batching React 18]
5. I 4 MFE di UI hanno isReady=true → useMicrofrontend esegue il mount
6. Ogni MFE fa il proprio PULL (§ 5.4) e registra le proprie sottoscrizioni
```

### 6.2 Scrittura — es. "aggiungi item" da `mfe_1`

```
mfe_1  handleAdd()
  └─> serviceApi.addItem("Nuovo")
        └─ service_mfe:
             notifyLoadingChange('items', true, 'addItem')   ──► mfe_2: "➕ Adding new item..."
             POST http://localhost:4000/items {name:"Nuovo"}
             notifyDataChange('items', fetchItemsHandler):
                 notifyLoadingChange('items', true,  'dataSync') ──► mfe_2: "🔄 Syncing data..."
                 GET /items                                  (ri-lettura della lista intera)
                 per ogni listener del canale 'items': cb(items)
                     ├─► mfe_1  setItems(items)
                     ├─► mfe_2  setItems + ri-applica currentFilter (§ 5.5)
                     └─► notifications_mfe  setStats + push activity
                 notifyLoadingChange('items', false, 'dataSync')
             notifyLoadingChange('items', false, 'addItem')

notifications_mfe, cambiando stats, esegue broadcastStats()   (§ 5.8)
  └─> notifyDataChange('notifications', {stats, ...})
        ├─► mfe_1 / mfe_2   header "👥 Users: 8"
        └─► users_mfe       header "📊 Items: 4"
```

### 6.3 Filtro (`mfe_2`)

`applyFilter()` chiama `serviceApi.filterItems(q)` → `GET /items?q=<query>` (filtro **server-side**
di json-server). Il filtro attivo viene memorizzato in `currentFilter`, e ogni evento `items`
successivo viene ri-filtrato **client-side** su `item.name` (§ 5.5).

---

## 7. Ciclo di vita del mount lato container

Tutto passa da [useMicrofrontend.ts](container/src/mfe/hooks/useMicrofrontend.ts):

```tsx
const { elementRef } = useMicrofrontend({
  moduleName: 'mfe_1/mount',      // chiave di moduleLoader.ts, non una stringa arbitraria
  mountProps: { serviceApi },     // diventa il 2° argomento di mount({el, ...mountProps})
  isReady,                        // gate: se false NON monta
  dependencies: [serviceApi],     // cambia → smonta e rimonta
  updatePropsOnChange: false,     // true → chiama instance.updateProps() invece di rimontare
  retryOnFailure: true, maxRetries: 5, retryDelay: 2000,
});
return <div ref={elementRef} />;
```

Il `<div>` è l'unico punto di contatto DOM: l'host non renderizza nulla dentro, si limita a
passarne il riferimento a `mount()`. Da lì in poi quel sottoalbero appartiene al remote, che ci
crea sopra il proprio `createRoot()`.

I root sono tenuti in una `WeakMap<HTMLElement, Root>` (→ [A.14](#a14-weakmap-e-perché-non-una-map)) per elemento
([useMount.ts](mfe_1/src/useMount.ts)), così un rimontaggio sullo stesso `<div>` non crea root
duplicati. Il cleanup del `useEffect` chiama `instance.unmount()` → `root.unmount()` nel remote,
che a sua volta fa scattare i cleanup dei suoi `useEffect` e quindi tutte le unsubscribe (§ 5.2).

---

## 8. Isolamento: cosa è condiviso e cosa no

Verificato a runtime, **non** è quello che ci si aspetterebbe:

| Risorsa | Realtà |
|---|---|
| React / ReactDOM | **2 istanze**: una del container, una condivisa fra tutti e 5 i remote (§ 3.5) |
| `styled-components` | **2 copie**: v6.1.19 in `mfe_1`/`mfe_2`/`users_mfe`, v5.3.11 in `notifications_mfe` |
| `theme.ts` | **3 copie identiche** (stesso md5) in `mfe_1`, `mfe_2`, `users_mfe` |
| Stato applicativo | Nessuno condiviso: ogni MFE ha il proprio `useState`, sincronizzato via bus |

La doppia istanza di React non è bloccante *in questa architettura* (→ [A.3](#a3-perché-due-react-sono-un-problema)), perché nessun elemento React
attraversa il confine: il container passa solo oggetti JS semplici e ogni remote crea il proprio
`createRoot()`. Diventerebbe un bug immediato volendo condividere un Context, un hook o un
componente fra host e remote.

**Rimedio**: aggiungere allo host lo stesso blocco `shared` dei remote.

```js
// container/webpack.config.js
new ModuleFederationPlugin({
  name: 'container',
  remotes: { /* ... */ },
  shared: {
    react:       { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  },
})
```

---

## 9. Avvio, arresto, diagnosi

```bash
./start_all_mfe.sh            # npm install + npm start di tutti i servizi, log in logs/
./start_all_mfe.sh --clean    # rimuove prima node_modules e package-lock.json
./check_mfe_endpoints.sh      # HTTP 200 su ogni remoteEntry.js + /items
./stop_all_mfe.sh             # SIGTERM via logs/*.pid, poi pulizia porte
./stop_all_mfe.sh --force     # SIGKILL

tail -f logs/mfe_1.log        # output webpack del singolo servizio
```

App su **http://localhost:3000**. Ordine di avvio: `mock_json_server → service_mfe → mfe_1 →
mfe_2 → users_mfe → notifications_mfe → container`, con 2 s fra uno e l'altro.

Per ispezionare la Module Federation dalla console del browser:

```js
window.mfe_1                          // { get, init } — il container object del remote
await window.mfe_1.get('./mount')     // la factory del modulo esposto
Object.keys(el).filter(k => k.startsWith('__reactContainer$'))   // quale istanza React usa un nodo
```

> `stop_all_mfe.sh` fa anche `kill -9` su **qualunque** processo che matchi `npm start` o
> `webpack.*serve` sulla macchina, non solo su quelli di questo progetto.

### Prerequisito non ovvio

`container/public/index.html` e `notifications_mfe/public/index.html` sono i template di
`HtmlWebpackPlugin`. Senza di essi il build **fallisce**. Erano assenti dal repository perché
`.gitignore` conteneva una regola `public` (residuo di un template Gatsby); la regola è stata
rimossa e i template sono ora versionati.

---

## 10. Anomalie note

### 10.1 `loaders` / `errors` non sono reattivi — UI morta in `mfe_1` e `users_mfe`

`serviceApi.loaders` è un **getter** che legge lo stato React interno di `service_mfe`
(perché un getter non è reattivo: → [A.11](#a11-getter-perché-serviceapiloaders-sembra-reattivo-e-non-lo-è)):

```ts
get loaders() { return apiRef.current?.loaders || { ... }; }
```

`useItems` / `useUsers` lo leggono durante il render:

```ts
const loaders = serviceApi?.loaders || { ... };   // snapshot, nessuna sottoscrizione
```

Nessuno notifica il remote quando quel valore cambia, quindi il componente non ri-renderizza e i
banner "➕ Adding item…", "🔄 Loading items…", "❌ Error…" **non compaiono mai**. Verificato con un
`MutationObserver` durante un add: `addingItem: false`, `addingUser: false`.

È esattamente il contrasto con § 5.7: lì c'è una sottoscrizione che chiama `setState`, qui no.

**Fix consigliato**: eliminare i getter dall'API e far consumare a `mfe_1` e `users_mfe` lo stesso
`onLoadingChange` già usato da `mfe_2`, aggiungendo un `onErrorChange` analogo. In alternativa,
esporre `loaders` con `useSyncExternalStore`.

### 10.2 Rimontaggio del remote a ogni render dell'host

In `useMicrofrontend` le dipendenze dell'effetto sono
`[moduleName, isReady, attemptMount, ...dependencies]`, e `attemptMount` è una `useCallback` che
dipende da `mountProps` e `onLoad`. Entrambi sono **ricreati a ogni render** del wrapper
(`mountProps: { serviceApi }` è un literal; `onLoad` è una arrow inline in `bootstrap.tsx`).

Ogni re-render di `<App>` provoca quindi `unmount()` + `mount()` di tutti i remote, con perdita
dello stato locale, ri-sottoscrizione al bus e nuove fetch. Oggi è innocuo perché `<App>`
renderizza esattamente due volte (iniziale + `setServiceApi`/`setIsReady` batchati). Diventa un
problema al primo pezzo di stato aggiuntivo nell'host.

**Fix consigliato**: memoizzare `mountProps` con `useMemo`, tenere `onLoad` in una ref (come già
fa correttamente `Service_Mfe.tsx`) e togliere `attemptMount` dalle dipendenze.

### 10.3 Contratto `addItem` / `addUser` disallineato

L'interfaccia dichiara `addItem(item: any)`, ma l'implementazione
([useApi.ts](service_mfe/src/useApi.ts)) fa `newItem.trim()` e costruisce `{ name: newItem }`:
**si aspetta una stringa**. Passare un oggetto lancia `TypeError`. Idem `addUser`, che genera
anche l'email in modo implicito (`nome → nome@example.com`). I chiamanti attuali passano una
stringa, quindi il difetto è latente.

### 10.4 Header CORS incoerenti fra i dev server

`users_mfe` (3004) e `notifications_mfe` (3005) impostano `Access-Control-Allow-Origin: *`;
`mfe_1` (3001), `mfe_2` (3002) e `service_mfe` (3003) **no**. Funziona lo stesso perché il
`remoteEntry.js` viene caricato con un tag `<script>` (§ 3.3), non soggetto a CORS. Si romperebbe
attivando `output.crossOriginLoading` o servendo i remote da un dominio diverso.

### 10.5 Nessun test

La suite esistente era inservibile ed **è stata rimossa** (`container/jest.config.js`,
`container/src/__tests__/`, `container/src/__mocks__/`, `service_mfe/src/__tests__/`), insieme
alle devDependency `jest`, `@types/jest` e `@testing-library/*` che servivano solo a lei.
Motivi per cui non girava, utili a chi la riscrive:

- `jest.config.js` usava `preset: 'ts-jest'` senza avere `ts-jest` installato, e
  `container/package.json` non aveva nemmeno uno script `test`;
- i `moduleNameMapper` puntavano a `<rootDir>/container/src/...` mentre `rootDir` **era già**
  `container/` → percorsi doppi;
- `setupFilesAfterEnv` puntava a `@testing-library/jest-dom/extend-expect`, rimosso in v6;
- `App.test.tsx` mockava un contratto che non esiste più (`options.data`, `onAdd`, `onRemove`);
- `service_mfe/src/__tests__/mount.test.ts` chiamava `mount(mockElement)` posizionale, mentre la
  firma reale è `mount({ el })`.

**Per ricominciare**: jest non sa nulla di Module Federation, quindi ogni `import('<remote>/mount')`
va rimappato con `moduleNameMapper` su un mock locale. Il mock che conta è quello di
`service_mfe/mount`: deve restituire una `ServiceMfeApi` finta (i `fetch*` più
`onDataChange`/`notifyDataChange`), così da poter asserire che un broadcast arriva davvero allo
stato dei remote (§ 5.4).

### 10.6 Codice morto — rimosso

Questa sezione elencava il codice non referenziato da nulla. **È stato cancellato**: quanto
segue resta come traccia di cosa c'era e perché.

| Rimosso | Cos'era |
|---|---|
| `container/src/mfe/Store_Mfe.tsx` | file vuoto, residuo di `store_mfe` |
| `container/src/mfe/service/` (`ServiceContext.tsx`, `useService.ts`, `ServiceContextExports.ts`) | approccio Context precedente; `useService` chiamava `mount(el)` con la firma vecchia |
| `container/src/MFEstatus.tsx` + `MFEstatus.module.css` | dashboard di stato mai renderizzata |
| `container/src/theme.module.css` | foglio di stile mai importato |
| `container/src/mfe/hooks/createMicrofrontendComponent.tsx` | HOC mai usato, elenco remote non aggiornato |
| `container/src/types/types.ts` | tipi duplicati e superati; il contratto vero è in `remotes.d.ts` |
| `NotificationsMfeMountProps` / `NotificationsMfeApi` in `Notifications_Mfe.tsx` | copie locali del contratto già dichiarato in `remotes.d.ts` |
| `mock_json_server/cors.js` | `server.js` non lo registrava (usa `jsonServer.defaults()`) |
| `service_mfe` → `exposes: './api'` | nessuno consumava questo entry point |
| `mfe_2` → `shared: { '@reduxjs/toolkit', 'react-redux' }` | pacchetti non installati, residuo di `store_mfe` |
| `addItem` / `removeItem` in `service_mfe/src/api.ts` | varianti write-then-refetch: il percorso vivo usa le `*Immediate` |
| `createMountFunction` in `useMount.ts` (mfe_1, mfe_2, users_mfe) | factory mai usata: ogni remote scrive il proprio `mount()` |
| `StatusMessage` in `notifications_mfe/src/components.ts` | styled-component mai renderizzato |
| import inutilizzato di `react` in `service_mfe/src/api.ts` | il modulo è di sole funzioni |

`npx tsc --noEmit` è ora pulito in tutti i pacchetti, tranne i file di test di § 10.5.

### 10.7 Minori

- **Canale `loading:users` a vuoto**: `loadingChangeListeners.users` viene popolato da
  `addUser`/`removeUser` ma nessun MFE lo sottoscrive. `users_mfe` non ha l'equivalente di
  `externalLoading` di `mfe_2`.
- **`notifications_mfe` legge stato stale** (§ 5.5): `updatedUsers.length > stats.totalUsers`
  usa uno `stats` già superato per decidere il tipo di attività, e mette `stats.totalUsers` /
  `stats.totalItems` nelle dipendenze, ri-sottoscrivendo il bus a ogni statistica che cambia.
- **`notifyDataChange` è sovraccarico** in `service_mfe`: esiste una funzione di modulo
  `notifyDataChange(dataType, getLatestData)` che ri-legge dal backend e notifica, e un metodo
  omonimo dell'API che fa un broadcast diretto (`broadcastDataChange`). Due semantiche, un nome.
- `container/src/index.ts` dichiara `interface Window { poc_service_url }` dentro un modulo: è
  un'interfaccia locale, non un'augmentation globale. Le due globali assegnate non sono usate.
- `container/tsconfig.json` imposta `typeRoots: ["./src/types"]`, che impedisce la risoluzione di
  `@types/jest` e degli altri `@types` da `node_modules`.
- `delay.js` applica 2 s **solo** a `GET /items` senza `?q`. Il ritardo è pagato tre volte in
  parallelo all'avvio (mfe_1, mfe_2, notifications_mfe).
- Warning in console: *"several instances of styled-components"* (§ 8) e *unknown prop `variant`*
  (prop non transiente inoltrata al DOM in `mfe_2`; usare `$variant`).

---

## 11. Verifica eseguita

Sistema avviato per intero (7 servizi) e guidato da browser. Esito:

| Verifica | Esito |
|---|---|
| 7 servizi rispondono, tutti i `remoteEntry.js` HTTP 200 | ✅ |
| I remote registrano `window.<name> = {get, init}`; `get('./mount')` risolve | ✅ |
| I 4 MFE di UI si montano nel container, `Service ready: ✅` | ✅ |
| Caricamento iniziale: 3 items e 7 users letti dal backend e mostrati | ✅ |
| Add item da `mfe_1` → lista `mfe_1`, lista `mfe_2` (3→4), stat `notifications` (3→4), activity | ✅ |
| Rimbalzo `notifications` → header `users_mfe` "📊 Items: 4", header `mfe_1`/`mfe_2` "👥 Users: 8" | ✅ |
| Add user da `users_mfe` → propagazione simmetrica sul canale `users` | ✅ |
| Loading cross-MFE in `mfe_2`, sequenza `addItem:true → dataSync:true/false → addItem:false` | ✅ |
| Registri del bus condivisi fra istanze di `mount()` (singleton di modulo, § 5.1) | ✅ |
| Stesso riferimento all'array per tutti i sottoscrittori, ordine di registrazione (§ 5.6) | ✅ |
| Filtro server-side `?q=` e ri-applicazione del filtro dopo una remove (§ 5.5) | ✅ |
| Banner di loading/errore locali di `mfe_1` e `users_mfe` | ❌ § 10.1 |
| React condiviso fra host e remote | ❌ § 3.5, § 8 |
| Suite di test | ❌ assente, § 10.5 |

**Conclusione: l'idea di base funziona.** Il pattern "un servizio headless come data layer +
message bus, iniettato per parametro" regge: i micro-frontend restano disaccoppiati (zero import
incrociati), la sincronizzazione è reale e bidirezionale, e l'aggiunta di un MFE non tocca il
codice degli altri. I difetti trovati sono di implementazione (§ 10), non di architettura —
tranne la mancata condivisione di React (§ 8), da sistemare prima di condividere qualsiasi cosa
di React fra host e remote.

---

## 12. Aggiungere un nuovo micro-frontend

**Lato remote**

1. Nuova cartella con `webpack.config.js`:

   ```js
   new ModuleFederationPlugin({
     name: 'nuovo_mfe',                            // → window.nuovo_mfe
     filename: 'remoteEntry.js',
     exposes: { './mount': './src/mount.tsx' },    // → nuovo_mfe/mount
     shared: { react: {singleton:true}, 'react-dom': {singleton:true} },
   })
   ```
   più `output.publicPath: 'auto'` (§ 3.1), `devServer.port` e
   `headers: { 'Access-Control-Allow-Origin': '*' }`.

2. `src/mount.tsx` che esporta `mount({ el, serviceApi })` usando `mountUtils.render`.

3. Consumare i dati **solo** via `serviceApi`: pull con `fetchX()` all'avvio, push con
   `onDataChange(canale, cb)` per restare sincronizzato (§ 5.4). Ricordare le dipendenze
   dell'effetto se la callback legge stato del componente (§ 5.5).

**Lato host** — i tre punti di § 3.4:

4. `container/webpack.config.js` → voce in `remotes`.
5. [moduleLoader.ts](container/src/mfe/hooks/moduleLoader.ts) → `'nuovo_mfe/mount': () => import('nuovo_mfe/mount')`.
6. [remotes.d.ts](container/src/types/remotes.d.ts) → `declare module 'nuovo_mfe/mount'`.
7. Wrapper in `container/src/mfe/` con `useMicrofrontend`, istanziato in
   [bootstrap.tsx](container/src/bootstrap.tsx) passando `serviceApi` e `isReady`.

**Operatività**

8. Aggiungere il servizio a `start_all_mfe.sh`, `stop_all_mfe.sh` e `check_mfe_endpoints.sh`.

**Per un canale dati nuovo** servono due modifiche in `service_mfe/src/mount.tsx`: una entry in
`dataChangeListeners` e l'aggiunta del nome al tipo unione
`'items' | 'users' | 'notifications'`. Verificare a mano che non si crei un ciclo di
pubblicazione (§ 5.8).

---

# Appendice A: drill-down dei concetti difficili

Dodici concetti, dal più basilare al più specifico. Ognuno ha la stessa struttura:
**il problema** che lo rende necessario, **la spiegazione** con un esempio minimo, e
**nel progetto**, cioè dove esattamente lo incontri. Si leggono in ordine: A.1–A.3 sono le
fondamenta su cui poggiano tutti gli altri.

| | Concetto | Serve per capire |
|---|---|---|
| [A.1](#a1-modulo-istanza-riferimento) | Modulo, istanza, riferimento | § 3.5, § 5.1, § 5.6 |
| [A.2](#a2-closure) | Closure | § 5.2, § 5.5 |
| [A.3](#a3-perché-due-react-sono-un-problema) | Perché due React sono un problema | § 3.5, § 8 |
| [A.4](#a4-che-problema-risolve-module-federation) | Che problema risolve Module Federation | § 1, § 3 |
| [A.5](#a5-remoteentryjs-container-object-factory) | `remoteEntry.js`, container object, factory | § 3.3 |
| [A.6](#a6-share-scope-e-singleton) | Share scope e `singleton` | § 3.1, § 3.5 |
| [A.7](#a7-lasync-boundary-e-il-tick) | L'async boundary e il "tick" | § 3.2 |
| [A.8](#a8-publishsubscribe-il-pattern-del-bus) | Publish/subscribe | § 5 |
| [A.9](#a9-useeffect-quando-gira-e-perché-esiste-il-cleanup) | `useEffect`, cleanup, dipendenze | § 5.2, § 5.4 |
| [A.10](#a10-stale-closure-dove-a2-incontra-a9) | Stale closure | § 5.5 |
| [A.11](#a11-getter-perché-serviceapiloaders-sembra-reattivo-e-non-lo-è) | Getter e reattività | § 10.1 |
| [A.12](#a12-perché-mount-e-non-un-componente-react) | Perché `mount()` e non un componente | § 4.1 |

Più tre note brevi: [A.13 la facciata sincrona](#a13-la-facciata-sincrona-su-unapi-asincrona) ·
[A.14 WeakMap](#a14-weakmap-e-perché-non-una-map) ·
[A.15 publicPath auto](#a15-publicpath-auto).

---

## A.1 Modulo, istanza, riferimento

### Il problema

Tre parole che in questa guida ricorrono ovunque e che, se restano vaghe, rendono
incomprensibili § 3.5 (due React), § 5.1 (i listener condivisi) e § 5.6 (l'array condiviso).

### Un modulo viene valutato **una volta sola**

Un modulo è un file con `import`/`export`. La prima volta che qualcuno lo importa, il suo codice
viene **eseguito**; il risultato viene messo in cache e tutti gli import successivi ricevono
**quello stesso risultato**, senza rieseguire nulla.

```js
// contatore.js
console.log('sto girando!');
export const numeri = [];          // creato UNA volta

// a.js
import { numeri } from './contatore.js';   // → stampa "sto girando!"
numeri.push(1);

// b.js
import { numeri } from './contatore.js';   // → NON stampa niente: già in cache
console.log(numeri);                       // → [1]   ← è lo stesso array di a.js
```

Tutto ciò che sta al livello superiore di un file (fuori dalle funzioni) è quindi
**uno solo per tutto il programma**. Si dice che vive nel *module scope*.

### Istanza

"Istanza di una libreria" = una copia del suo codice **valutata**, con il proprio stato interno.
Se lo stesso pacchetto viene valutato due volte — perché due bundle diversi lo contengono
entrambi — ottieni due istanze, con due stati interni separati che non si parlano.

```
bundle A ──▶ react-dom  (istanza 1, con il suo registro interno)
bundle B ──▶ react-dom  (istanza 2, con un registro DIVERSO)
```

La cache dei moduli è **per bundle**: ogni applicazione compilata ha la sua. È esattamente la
ragione per cui in questo progetto esistono due React (→ A.3, § 3.5).

### Riferimento vs copia

In JavaScript oggetti e array si passano **per riferimento**: la variabile non contiene i dati,
contiene l'indirizzo dei dati. Due variabili possono puntare alla stessa cosa.

```js
const a = [1, 2, 3];
const b = a;          // NON è una copia
b.push(4);
console.log(a);       // → [1, 2, 3, 4]   ← modificato anche a
console.log(a === b); // → true

const c = [...a];     // QUESTA è una copia
c.push(5);
console.log(a === c); // → false
```

### Nel progetto

- § 5.1 — i `Set` dei listener stanno nel module scope di `service_mfe/src/mount.tsx`: sono
  **uno solo**, condiviso da chiunque usi quel modulo. Per questo montare `service_mfe` una
  seconda volta non crea un secondo bus, ma si attacca allo stesso.
- § 5.6 — quando il bus notifica, passa a tutti i sottoscrittori lo **stesso riferimento**
  all'array (`a === b` → `true`). Se un MFE facesse `items.sort()`, riordinerebbe la lista
  anche negli altri tre. Da qui la regola: copiare prima di modificare.
- § 3.5, § 8 — due istanze di react-dom.

---

## A.2 Closure

### Il problema

Le callback del bus (§ 5.2) sono funzioni definite dentro un componente React e chiamate molto
dopo, da un altro modulo. Come fanno a "ricordarsi" delle variabili del componente? E perché a
volte si ricordano del **valore sbagliato** (→ A.10)?

### La spiegazione

Una funzione, quando viene creata, si porta dietro l'ambiente in cui è nata. Quell'ambiente resta
vivo finché la funzione esiste, anche se chi l'ha creata ha già finito.

```js
function creaContatore() {
  let n = 0;                    // variabile locale
  return () => { n += 1; return n; };
}

const conta = creaContatore();  // creaContatore() è FINITA
conta();  // → 1                ← eppure `n` esiste ancora
conta();  // → 2                ← ed è la stessa `n`
```

La coppia "funzione + ambiente catturato" si chiama **closure**.

Il punto che genera i bug: la closure cattura **le variabili**, ma se quelle variabili non
cambiano mai (come le `const` di un render React), la funzione resta legata per sempre al valore
che avevano in quel momento.

```js
function render(valore) {
  const x = valore;             // nuova `const x` a ogni chiamata
  return () => console.log(x);  // ogni funzione vede la SUA x
}

const f1 = render('primo');
const f2 = render('secondo');
f1();  // → "primo"    ← f1 non saprà mai di f2
f2();  // → "secondo"
```

Ogni render di un componente React è una chiamata di funzione come `render()` qui sopra: crea un
nuovo set di `const` e le funzioni definite lì dentro restano agganciate a quelle.

### Nel progetto

```ts
// mfe_1/src/useItems.ts — questa callback vivrà per tutta la vita del componente
serviceApi.onDataChange('items', (updatedItems) => setItems(updatedItems));
```

`setItems` viene catturata dalla closure. Quando `service_mfe` chiamerà quella callback — minuti
dopo, da un altro modulo, senza sapere nulla di React — `setItems` sarà ancora lì e funzionerà.
È il ponte fra il bus (JavaScript puro) e React.

---

## A.3 Perché due React sono un problema

### Il problema

§ 3.5 e § 8 dicono che nel progetto ci sono due istanze di React e che "non è bloccante *in
questa architettura*". Perché mai due copie della stessa libreria dovrebbero dare fastidio?

### La spiegazione

React non è una collezione di funzioni pure: tiene **stato interno globale** nel proprio module
scope (→ A.1). Fra le altre cose, il "componente attualmente in render", che è ciò che permette a
`useState` di sapere a chi appartiene lo stato che sta creando.

```
istanza 1 di React        istanza 2 di React
 ├─ componente corrente    ├─ componente corrente   ← due variabili DIVERSE
 ├─ registro degli hook    ├─ registro degli hook
 └─ albero dei context     └─ albero dei context
```

Se un componente creato con l'istanza 1 chiama un hook che finisce nell'istanza 2, la seconda non
ha idea di chi stia rendendo: è il celebre errore *"Invalid hook call"*. Stessa cosa per i
Context: un `Provider` dell'istanza 1 è invisibile a un `useContext` dell'istanza 2, perché
l'oggetto context stesso è un'altra istanza.

### Perché qui non esplode

Il confine fra host e remote viene attraversato solo da **oggetti JavaScript semplici**:

```ts
mount({ el: <un nodo DOM>, serviceApi: <un oggetto con funzioni> })
```

Nessun elemento React, nessun hook, nessun Context. Ogni remote fa il proprio `createRoot()` e da
lì in giù usa una sola istanza, la sua. Le due istanze convivono senza mai incontrarsi.

Esploderebbe subito, invece, il giorno in cui il container volesse passare `<ThemeProvider>`
attorno ai remote, o esportare un hook condiviso, o passare un `children` React. Da qui la
raccomandazione di § 8: sistemare il `shared` dell'host **prima** di provarci.

### Come si misura

react-dom marca ogni nodo DOM radice con una chiave che contiene un identificativo casuale,
generato **una volta per istanza**. Chiavi diverse = istanze diverse.

```js
Object.keys(document.getElementById('root'))
      .filter(k => k.startsWith('__reactContainer$'))
// → ['__reactContainer$gkae1icwrj']    ← l'istanza del container
```

---

## A.4 Che problema risolve Module Federation

### Il problema

Cinque squadre, cinque applicazioni React, una sola pagina. Le alternative "ovvie" hanno tutte un
difetto grosso:

| Approccio | Come funziona | Perché non basta |
|---|---|---|
| Pacchetto npm | ogni MFE è una libreria che l'host importa | per aggiornare un MFE devi **ricompilare e ridistribuire l'host**: le squadre non sono più indipendenti |
| `<iframe>` | ogni MFE in un documento separato | isolamento totale ma anche comunicazione dolorosa, stili e layout non condivisibili, altezze e routing da gestire a mano |
| `<script>` globale | ogni MFE si registra su `window` | nessuna condivisione delle dipendenze: cinque React scaricati interi, e nessun controllo sulle versioni |

### La spiegazione

Module Federation aggiunge a webpack la capacità di **caricare un modulo compilato da un altro
build, a runtime, via HTTP**, negoziando quali dipendenze condividere.

```
        compile time                          runtime
  ┌──────────────────────┐          ┌────────────────────────────┐
  │ mfe_1 viene compilato│          │ il browser apre l'host      │
  │ da solo, sulla sua   │   ───▶   │ scarica remoteEntry.js      │
  │ macchina, quando     │          │ da localhost:3001           │
  │ vuole la sua squadra │          │ e ne usa il modulo `mount`  │
  └──────────────────────┘          └────────────────────────────┘
```

I due punti che la rendono diversa da un semplice `<script>`:

1. **L'host non conosce il codice del remote a compile time.** Sa solo un URL. Aggiornare
   `mfe_1` significa ridistribuire `mfe_1`; l'host non si tocca e non si ricompila.
2. **Le dipendenze si negoziano.** Se host e remote dichiarano `react` come `shared`, una sola
   copia viene scaricata e usata da entrambi (→ A.6).

### Nel progetto

L'host dichiara i cinque URL in `remotes` (§ 3.1) e non sa altro. Ogni remote dichiara `name`,
`filename` ed `exposes`. In cambio, il codice dell'host può scrivere:

```ts
import('mfe_1/mount')   // un modulo che al momento della compilazione NON esiste
```

---

## A.5 `remoteEntry.js`, container object, factory

### Il problema

§ 3.3 elenca cinque passi con nomi opachi — *container object*, `get`, `init`, *factory*. Cosa
sono, concretamente?

### La spiegazione

`remoteEntry.js` è un file minuscolo (qualche kB) che **non contiene** l'applicazione: contiene
solo il suo *catalogo*. Eseguirlo crea una variabile globale con il nome del remote:

```js
window.mfe_1 = {
  init(shareScope) { ... },   // "ecco le dipendenze condivise, mettiti d'accordo"
  get(nomeEsposto) { ... },   // "dammi il modulo che hai registrato con questo nome"
};
```

Questo oggetto è il **container object**: lo sportello del remote. Verificabile in console a
sistema avviato — `window.mfe_1` → `{get: ƒ, init: ƒ}`.

`get('./mount')` non restituisce il modulo, ma una Promise che risolve in una **factory**: una
funzione che, chiamata, restituisce il modulo. Due passi invece di uno perché i due lavori sono
di natura diversa:

```js
const factory = await window.mfe_1.get('./mount');  // 1. ASINCRONO: scarica i chunk necessari
const modulo  = factory();                          // 2. SINCRONO:  valuta e restituisce gli export
console.log(Object.keys(modulo));                   // → ['mount', 'unmount']
```

Il primo passo può richiedere rete, il secondo no. Separandoli, webpack può chiamare la factory
tutte le volte che vuole senza riscaricare nulla — e grazie alla cache dei moduli (→ A.1)
restituisce sempre **lo stesso** oggetto modulo. È il motivo per cui la sonda di § 5.1 ha
trovato gli stessi `Set` di listener.

### Nel progetto

Non scrivi mai questi cinque passi a mano. Scrivi `import('mfe_1/mount')` e webpack, vedendo che
`mfe_1` è un remote dichiarato, sostituisce quella riga con la sequenza completa. I passi sono
comunque visibili nel tab Network: prima `remoteEntry.js` da `:3001`, poi i chunk veri.

---

## A.6 Share scope e `singleton`

### Il problema

Cinque remote più un host, ognuno con `react` nel proprio `node_modules`. Senza accordi, il
browser scarica sei React. Come si mettono d'accordo applicazioni compilate separatamente, che
non si conoscevano al momento della build?

### La spiegazione

Lo **share scope** è un oggetto condiviso che fa da bacheca: chi ha una copia di una libreria la
mette in bacheca con la propria versione, chi ne ha bisogno guarda in bacheca prima di usare la
propria.

```
                    share scope "default"
      ┌───────────────────────────────────────────┐
      │  react     → { "18.3.1": <fabbrica>, ... } │
      │  react-dom → { "18.3.1": <fabbrica>, ... } │
      └───────────────────────────────────────────┘
             ▲ registrano          │ consumano
             │                     ▼
      host + remote 1..5    ognuno riceve la versione vincente
```

Il flusso è: l'host crea lo scope → lo passa a ogni `remote.init(scope)` → ogni partecipante
registra le proprie copie e consuma quella vincente.

Le opzioni che contano:

| Opzione | Significato |
|---|---|
| `singleton: true` | **una sola** versione in tutta la pagina, anche se le versioni non coincidono (con un warning). Obbligatorio per librerie con stato globale come React (→ A.3) |
| `requiredVersion` | il range che il partecipante accetta |
| `eager: false` | la libreria sta in un chunk separato, caricato solo se serve. È il default e presuppone un async boundary (→ A.7) |
| `eager: true` | la libreria è dentro il bundle principale, disponibile subito ma sempre scaricata |

### Nel progetto

I cinque remote dichiarano `react` e `react-dom` come `singleton` e vanno d'accordo: hanno tutti
la 18.3.1 e finiscono per usare **una sola** istanza.

L'host invece dichiara `remotes` ma **non** `shared`. Non è un partecipante della bacheca: crea
lo scope, lo passa in giro, e poi usa la propria copia di React senza consultarlo. Da qui le due
istanze di § 3.5. Il rimedio in § 8 è semplicemente aggiungere all'host lo stesso blocco `shared`
che hanno i remote.

---

## A.7 L'async boundary e il "tick"

### Il problema

§ 3.2 dice che `container/src/index.ts` **deve** fare `import('./bootstrap')` dinamico, e che un
`import` statico romperebbe tutto. Perché?

### La spiegazione: statico vs dinamico

```js
import x from './a.js';              // STATICO  — sintassi, risolto prima dell'esecuzione
const x = await import('./a.js');    // DINAMICO — una funzione, restituisce una Promise
```

Gli import statici non sono istruzioni: sono **dichiarazioni**. Il motore li risolve e valuta
tutti i moduli importati **prima** che la prima riga del file corrente venga eseguita.

```js
// index.js
console.log('A');
import './b.js';        // b.js stampa 'B'

// output reale:  B  poi  A     ← non l'ordine in cui l'hai scritto
```

Un `import()` dinamico è invece una normalissima chiamata di funzione: succede **quando ci
arrivi**, e restituisce una Promise, quindi ciò che segue viene rimandato al giro dopo.

### Perché serve qui

Prendere una libreria dallo share scope (→ A.6) è un'operazione **asincrona**: bisogna aspettare
che tutti i remote abbiano fatto `init()`, e può servire scaricare un chunk. Ma se `bootstrap.tsx`
fosse importato staticamente, verrebbe valutato — insieme al suo `import React from 'react'` —
prima che l'entry point abbia potuto inizializzare alcunché.

```
  import statico:                        import dinamico:
  ┌──────────────────────┐               ┌──────────────────────┐
  │ valuta bootstrap     │  ← troppo     │ main.js:             │
  │  └ valuta react      │    presto     │  init share scope    │
  │ ...                  │               │  init dei remote     │
  │ init share scope     │  ← inutile    ├──────────────────────┤ ← boundary
  └──────────────────────┘               │ valuta bootstrap     │
                                         │  └ react dallo scope │  ← ora c'è
                                         └──────────────────────┘
```

Il `import()` dinamico crea quel gradino — l'**async boundary** — spezzando l'entry in due chunk
con l'inizializzazione in mezzo. Se lo togli, webpack fallisce con
*"Shared module is not available for eager consumption"*.

### Nel progetto

```ts
// container/src/index.ts — l'intero entry point
import('./bootstrap').then(() => console.log('Bootstrap loaded successfully'));
```

Un file di due righe che sembra inutile e invece è strutturale. Nel waterfall di § 3.2 si vede
il risultato: `main.js` (runtime + init) e `src_bootstrap_tsx.js` (l'app) sono due richieste
distinte, in quest'ordine.

---

## A.8 Publish/subscribe: il pattern del bus

### Il problema

`mfe_1` aggiunge un item. `mfe_2` e `notifications_mfe` devono saperlo. Ma se `mfe_1` li
chiamasse direttamente dovrebbe conoscerli — e allora addio indipendenza: aggiungere un sesto MFE
vorrebbe dire modificare i cinque esistenti.

### La spiegazione

Publish/subscribe (o *observer*) inverte la direzione: chi produce non conosce chi consuma. In
mezzo c'è un registro.

```
   PUBLISHER                 REGISTRO                 SUBSCRIBER
   "è cambiato items"  ──▶  lista di callback  ──▶   "aggiorno la mia lista"
   non sa chi ascolta        per canale               non sa chi ha pubblicato
```

L'implementazione minima sta in quindici righe, e sono concettualmente quelle di
`service_mfe`:

```js
const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);   // ← restituisce come disiscriversi
}

function publish(dati) {
  listeners.forEach(cb => cb(dati));
}
```

Tre dettagli non casuali:

- **`Set` e non array**: `add` non duplica e `delete` è immediato, senza cercare l'indice.
- **`subscribe` restituisce la funzione di unsubscribe**. Chi si iscrive riceve subito il modo
  per smettere, senza dover conservare un riferimento alla propria callback. È ciò che rende
  possibile la riga `return unsubscribe` di § 5.2 (→ A.9).
- **Il `forEach` è sincrono**: quando `publish` ritorna, tutte le callback sono già state
  eseguite.

### Nel progetto

Il registro sta nel module scope di `service_mfe` (→ A.1), diviso per canale:

```ts
const dataChangeListeners = {
  items:         new Set(),
  users:         new Set(),
  notifications: new Set(),
};
```

`onDataChange` è `subscribe`, `notifyDataChange` è `publish`. Il costo di questo disaccoppiamento
è che nulla ti impedisce di creare un ciclo — A pubblica su un canale che fa reagire B, che
pubblica sul canale che ascolta A. Nel progetto non succede (§ 5.8), ma è una verifica manuale,
non una garanzia del bus.

---

## A.9 `useEffect`: quando gira, e perché esiste il cleanup

### Il problema

Il pattern di § 5.2 sta in sei righe e ne contiene tre non ovvie: cosa fa il `return`, cosa fa
l'array finale, e perché non basta iscriversi una volta e amen.

### La spiegazione

`useEffect` serve per tutto ciò che **non** è calcolare l'interfaccia: iscriversi a qualcosa,
aprire una connessione, far partire un timer. React lo esegue **dopo** aver aggiornato il DOM.

```tsx
useEffect(
  () => {                        // (1) l'effetto
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);   // (2) il cleanup
  },
  [tick]                         // (3) le dipendenze
);
```

**(3) L'array di dipendenze** decide quando rieseguire l'effetto. Dopo ogni render React confronta
i valori dell'array con quelli del render precedente, uno per uno, con `===`:

| Array | Quando gira l'effetto |
|---|---|
| assente | dopo **ogni** render |
| `[]` | solo al primo mount |
| `[a, b]` | al mount, e ogni volta che `a` o `b` cambiano |

**(2) Il cleanup.** Se l'effetto deve rigirare, React **prima** esegue il cleanup del giro
precedente. Senza, ogni riesecuzione lascerebbe indietro un timer o un listener attivo:
dopo dieci render avresti dieci iscrizioni, tutte vive, e la callback verrebbe chiamata dieci
volte. È il classico memory leak da hook.

Sequenza completa quando una dipendenza cambia:

```
   render N     effetto registrato con le dipendenze [x=1]
   render N+1   x diventa 2
                → React esegue il CLEANUP del giro N   (rimuove il vecchio listener)
                → React esegue l'EFFETTO del giro N+1  (registra il nuovo)
   smontaggio   → React esegue il CLEANUP dell'ultimo giro
```

### Nel progetto

Il pattern di § 5.2 incastra questi tre pezzi nel modo più compatto possibile:

```ts
useEffect(() => {
  if (!serviceApi?.onDataChange) return;

  const unsubscribe = serviceApi.onDataChange('items', setItems);
  return unsubscribe;      // ← la unsubscribe di A.8 diventa il cleanup di React
}, [serviceApi]);
```

`onDataChange` restituisce già una funzione che si disiscrive (→ A.8), e la firma del cleanup di
`useEffect` è "una funzione senza argomenti": combaciano esattamente, quindi basta ritornarla.
Nessuna riga di pulizia da scrivere, nessun listener orfano.

Nota la guardia iniziale: `serviceApi` all'inizio vale `null` (l'host non l'ha ancora ricevuto),
l'effetto gira comunque ed esce subito; poi `serviceApi` cambia, l'effetto rigira e stavolta si
iscrive davvero. È il motivo per cui `serviceApi` è nell'array delle dipendenze.

---

## A.10 Stale closure: dove A.2 incontra A.9

### Il problema

È il bug più insidioso di React e il motivo per cui in § 5.5 `mfe_2` ha `currentFilter`
nell'array delle dipendenze — una riga che sembra superflua e non lo è.

### La spiegazione

Metti insieme i due fatti:

- una closure resta legata ai valori del render in cui è nata (→ A.2);
- un effetto con dipendenze incomplete **non rigira**, quindi la sua callback resta quella
  vecchia (→ A.9).

Risultato: la callback continua a vedere uno stato di dieci render fa. Non lancia errori, non
scrive in console: fa semplicemente la cosa sbagliata.

```tsx
const [filtro, setFiltro] = useState('');

useEffect(() => {
  return bus.subscribe(dati => {
    console.log(filtro);      // ← catturato dal render in cui l'effetto è girato
  });
}, []);                       // ← BUG: `filtro` manca

// l'utente scrive "abc" → il componente rirenderizza → ma l'effetto NON rigira
// → la callback continua a stampare ''  (per sempre)
```

Due rimedi, entrambi legittimi:

**1. Metterlo nelle dipendenze** — la callback viene ricreata a ogni cambio, con il valore fresco.
Costo: un cleanup + una nuova iscrizione a ogni cambio.

```tsx
}, [filtro]);
```

**2. Leggerlo da una ref** — la ref è un contenitore stabile il cui `.current` puoi aggiornare
senza rirenderizzare. La callback legge il contenitore, non il valore, quindi vede sempre
l'ultimo. Costo: una riga in più, e la ref non fa scattare render.

```tsx
const filtroRef = useRef(filtro);
useEffect(() => { filtroRef.current = filtro; }, [filtro]);

useEffect(() => {
  return bus.subscribe(() => console.log(filtroRef.current));  // sempre aggiornato
}, []);                                                        // iscrizione una volta sola
```

**3. Caso speciale: se devi solo aggiornare lo stato**, non serve nessuno dei due. L'updater
funzionale riceve il valore corrente da React stesso, quindi la closure non deve conoscerlo:

```tsx
setStats(prev => ({ ...prev, totalUsers: nuoviUtenti.length }));   // `prev` è sempre fresco
```

### Nel progetto

- **`mfe_2` fa la cosa giusta (rimedio 1).** La sua callback legge `currentFilter` per
  ri-applicare il filtro ai dati nuovi, quindi `currentFilter` è nelle dipendenze. Verificato in
  § 5.5: con un filtro attivo, una remove fatta da `mfe_1` non lo azzera.
- **`notifications_mfe` fa la cosa sbagliata** (§ 10.7). Legge `stats.totalUsers` per decidere se
  l'attività sia un'aggiunta o una rimozione, e lo mette nelle dipendenze — quindi si
  ri-iscrive a ogni statistica che cambia *e* il confronto usa comunque un valore già superato,
  perché nel frattempo `setStats` è stato chiamato nella stessa callback. Qui serviva il
  rimedio 3.

---

## A.11 Getter: perché `serviceApi.loaders` sembra reattivo e non lo è

### Il problema

§ 10.1 dice che i banner "Adding item…" di `mfe_1` non compaiono mai. Il codice sembra corretto e
il valore sottostante cambia davvero. Dov'è l'inganno?

### La spiegazione

Un **getter** è una proprietà che in realtà è una funzione: leggerla esegue del codice.

```js
const oggetto = {
  get ora() { return new Date().toISOString(); }
};

oggetto.ora   // → "2026-09-03T16:28:21.000Z"
oggetto.ora   // → "2026-09-03T16:28:22.000Z"   ← valore diverso, stessa proprietà
```

Sembra "vivo", e in un certo senso lo è: ogni lettura dà il valore aggiornato. Ma **nessuno
avvisa** chi ha letto la volta prima che nel frattempo il valore è cambiato.

Ed è precisamente ciò che React richiede. React non osserva le variabili: rirenderizza un
componente **solo** se qualcuno chiama la sua `setState`. Un valore letto durante il render è una
fotografia; se cambia dopo, il componente non lo saprà mai finché qualcos'altro non lo fa
rirenderizzare per altri motivi.

```
  valore reattivo               getter
  ──────────────                ──────
  cambia → setState             cambia → ...niente
        → React rirenderizza          → il componente resta com'è
        → la UI si aggiorna           → la UI mostra la fotografia vecchia
```

### Nel progetto

```ts
// service_mfe/src/mount.tsx — lato produttore
get loaders() { return apiRef.current?.loaders || { ... }; }

// mfe_1/src/useItems.ts — lato consumatore
const loaders = serviceApi?.loaders || { ... };    // fotografia, nessuna iscrizione
```

`loaders.addItem` diventa `true` dentro `service_mfe` per qualche centinaio di millisecondi, ma
`mfe_1` non ha nessun motivo per rirenderizzare in quella finestra: quando rirenderizzerà — al
`setItems` dell'evento — l'operazione sarà già finita e il valore sarà tornato `false`.
Il banner esiste nel JSX e non appare mai. Verificato con un `MutationObserver`.

Il contrasto è istruttivo: `onLoadingChange` di `mfe_2` (§ 5.7) trasporta la stessa informazione e
**funziona**, perché non è una lettura ma una notifica che chiama `setExternalLoading`. Stesso
dato, due meccanismi: uno pull e muto, uno push e parlante.

Da qui il fix consigliato in § 10.1: eliminare i getter e usare il canale che già esiste.

---

## A.12 Perché `mount()` e non un componente React

### Il problema

In un'app React normale si esporta un componente. Qui ogni remote esporta una funzione che
riceve un nodo DOM. Sembra un passo indietro di dieci anni.

### La spiegazione

Un componente React è utile **solo** a chi usa la stessa istanza di React (→ A.3). Esportarne uno
significa imporre a chiunque lo consumi: stessa libreria, stessa versione maggiore, stessa
istanza condivisa.

Una funzione che riceve un `HTMLElement` non impone niente. È un contratto che passa solo dal
DOM, il denominatore comune di qualunque framework:

```ts
mount({ el: HTMLElement, serviceApi: object }): { unmount(): void }
```

| | Esportare un componente | Esportare `mount()` |
|---|---|---|
| Il remote può usare Vue o Svelte | no | sì |
| Serve una sola istanza React | sì, obbligatorio | no |
| Context e provider dell'host arrivano al remote | sì | no |
| Chi controlla il ciclo di vita | React dell'host | il remote |

Il prezzo è che l'host non può comporre i remote come componenti: renderizza un `<div>` vuoto e
ne consegna il riferimento.

```tsx
// il container non renderizza NIENTE dentro questo div
return <div ref={elementRef} />;
// da qui in giù il sottoalbero appartiene al remote
```

### Nel progetto

È esattamente perché il contratto passa solo dal DOM che le due istanze di React di § 3.5 non
fanno danni. L'architettura è coerente con sé stessa: contratto minimo, isolamento massimo,
comunicazione via bus invece che via props e context.

---

## A.13 La facciata sincrona su un'API asincrona

`mount()` deve restituire l'API **subito**, ma gli handler veri (`fetchItems`, …) nascono dentro
un componente React che si monta poco dopo. Come si restituisce ora qualcosa che esisterà fra un
istante?

Con una Promise usata come "prenotazione": `mount()` ritorna immediatamente un oggetto di
**facciata** i cui metodi, prima di fare qualsiasi cosa, aspettano che l'API vera sia pronta.

```ts
let risolvi;
const apiPronta = new Promise(r => { risolvi = r; });   // in attesa

// dentro il componente, quando è montato:
useEffect(() => { risolvi(apiVera); }, [api]);          // sbloccata

// ciò che mount() restituisce SUBITO:
return {
  fetchItems: async () => (await apiPronta).fetchItems(),   // aspetta, poi delega
  // ...
};
```

Chi chiama non se ne accorge: fa `await serviceApi.fetchItems()` come se tutto fosse già pronto,
e se non lo è l'attesa avviene dentro. È una Promise creata una volta sola, quindi dopo il primo
`await` risolve istantaneamente per sempre.

---

## A.14 `WeakMap`, e perché non una `Map`

Serve associare un dato a un nodo DOM — qui: quale root React è stata creata su quale `<div>`.

```ts
const roots = new WeakMap<HTMLElement, Root>();
```

Con una `Map` normale, la mappa terrebbe **vivo** ogni nodo DOM inserito, anche dopo che è stato
rimosso dalla pagina: il garbage collector non potrebbe liberarlo perché la mappa lo referenzia
ancora. Montando e smontando MFE ripetutamente, la memoria crescerebbe senza limite.

Una `WeakMap` tiene le chiavi in modo **debole**: se nessun altro referenzia quel nodo, viene
raccolto e la voce sparisce da sola. In cambio non è iterabile (non puoi fare `.forEach` o
`.size`), il che qui non serve.

Nel progetto sta in `<remote>/src/useMount.ts` e serve a garantire che rimontare sullo stesso
`<div>` riusi la root esistente invece di crearne una seconda sopra la prima.

---

## A.15 `publicPath: 'auto'`

Quando webpack deve scaricare un chunk secondario, costruisce l'URL come
`publicPath + nomeDelChunk`. Il valore di default è relativo alla **pagina**, non allo script:
`mfe_1` servito da `:3001` ma eseguito in una pagina su `:3000` cercherebbe i propri chunk su
`http://localhost:3000/...` — che non esistono. È l'errore più comune al primo setup di Module
Federation.

Con `publicPath: 'auto'` webpack ricava il path a runtime dall'URL dello script già in
esecuzione (`document.currentScript.src`), quindi `mfe_1` chiede i propri chunk a `:3001`.
Nel progetto è impostato correttamente su tutti i remote, ed è verificabile nel tab Network:
ogni remote scarica i propri chunk dalla propria porta.
