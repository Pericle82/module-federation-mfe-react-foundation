// Dichiarazioni dei moduli federati esposti dai remote.
// Ogni remote espone UNA sola funzione `mount({ el, serviceApi })`.
// Il contratto reale e' definito in <remote>/src/mount.tsx: tenere i due allineati.

/** Handle restituito da un mount: consente al container di smontare il remote. */
interface MfeInstance {
  unmount: () => void;
}

/** Come sopra, ma il remote accetta anche aggiornamenti di props senza rimontare. */
interface UpdatableMfeInstance extends MfeInstance {
  updateProps: (props: { serviceApi?: ServiceMfeApi }) => void;
}

/** Canali del bus eventi di service_mfe. */
type MfeDataType = 'items' | 'users' | 'notifications';

/**
 * API restituita da `service_mfe/mount`. E' l'unico punto di contatto fra i
 * micro-frontend: nessun remote importa direttamente un altro remote.
 */
interface ServiceMfeApi {
  // --- Items ---
  fetchItems: () => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
  /** ATTENZIONE: l'implementazione attuale si aspetta una stringa (il nome), non un oggetto. */
  addItem: (name: any) => Promise<any[]>;
  removeItem: (id: string | number) => Promise<any[]>;

  // --- Users ---
  fetchUsers: () => Promise<any[]>;
  filterUsers: (query: string) => Promise<any[]>;
  /** ATTENZIONE: l'implementazione attuale si aspetta una stringa (il nome), non un oggetto. */
  addUser: (name: any) => Promise<any[]>;
  removeUser: (id: string | number) => Promise<any[]>;

  // --- Bus eventi ---
  /** Sottoscrive un canale dati. Ritorna la funzione di unsubscribe. */
  onDataChange: <T = any>(dataType: MfeDataType, callback: (data: T) => void) => () => void;
  /** Pubblica su un canale dati senza passare dal backend (usato da notifications_mfe). */
  notifyDataChange: (dataType: MfeDataType, data: any) => void;
  /** Sottoscrive lo stato di caricamento delle scritture. Ritorna la unsubscribe. */
  onLoadingChange: (
    dataType: 'items' | 'users',
    callback: (isLoading: boolean, operation?: string) => void
  ) => () => void;

  // --- Stato (snapshot, NON reattivo: vedi COMPREHENSIVE_GUIDE.md) ---
  readonly loaders: Record<string, boolean>;
  readonly errors: Record<string, string | null>;

  unmount: () => void;
}

declare module 'service_mfe/mount' {
  export function mount(options: { el: HTMLElement }): ServiceMfeApi;
}

declare module 'mfe_1/mount' {
  export function mount(options: { el: HTMLElement; serviceApi?: ServiceMfeApi }): MfeInstance;
  export function unmount(el: HTMLElement): void;
}

declare module 'mfe_2/mount' {
  export function mount(options: {
    el: HTMLElement;
    serviceApi?: ServiceMfeApi;
  }): UpdatableMfeInstance;
}

declare module 'users_mfe/mount' {
  export function mount(options: { el: HTMLElement; serviceApi?: ServiceMfeApi }): MfeInstance;
  export function unmount(el: HTMLElement): void;
}

declare module 'notifications_mfe/mount' {
  export function mount(options: { el: HTMLElement; serviceApi?: ServiceMfeApi }): MfeInstance;
  export function unmount(el: HTMLElement): void;
}
