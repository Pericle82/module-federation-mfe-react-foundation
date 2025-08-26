declare module 'mfe_1/mount' {
  type Mfe1Instance = {
    unmount?: () => void;
  };
  export function mount(options: {
    el: HTMLElement;
    items?: any[];
    onAddItem?: (item: any) => Promise<any[]>;
    onRemoveItem?: (id: string | number) => Promise<any[]>;
    onLoad?: () => void;
    isReady?: boolean; // Optional prop to indicate if the service is ready
    onAddItem?: (item: any) => Promise<any[]>;
    onRemoveItem?: (id: string | number) => Promise<any[]>;
  }): Mfe1Instance;
}

declare module 'mfe_2/mount' {
  interface MountOptions {
    el: HTMLElement;
    items: any[];
    onFilter?: (query: string) => Promise<any[]>;
    onMount?: Function;
  }

  interface Mfe2Instance {
    updateProps?: (props: { items: any[]; onFilter?: (query: string) => Promise<any[]> }) => void;
    unmount?: () => void;
  }

  export function mount(options: MountOptions): Mfe2Instance;
}

declare module 'service_mfe/mount' {
  import { ServiceApi } from './useService';
  export function mount(container: HTMLElement): ServiceApi;
}

declare module 'users_mfe/mount' {
  type UsersMfeInstance = {
    unmount?: () => void;
  };
  export function mount(options: {
    el: HTMLElement;
    serviceApi?: any;
  }): UsersMfeInstance;
}

