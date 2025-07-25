// Type declarations for remote MFEs

declare module 'mfe_1/mount' {
  type MountOptions = {
    el: HTMLElement;
    items: any[];
    onAddItem: (item: any) => Promise<void>;
    onRemoveItem: (id: string) => Promise<void>;
  };

  export function mount(options: MountOptions): Mfe1Instance;
}

declare module 'mfe_2/mount' {
  export function mount({ el, items = [], onFilter, onMount }: mf2MountProps): { unmount: () => void };
}

declare module 'store_mfe/mount' {
  export function mount(el: HTMLElement): { unmount: () => void };
  export function setDataGlobal(data: any): void;
  export function setStatusGlobal(mfe: string, status: string): void;
}



declare module 'service_mfe/mount' {
  export function mount(el: HTMLElement): ServiceMfeApi;
}

