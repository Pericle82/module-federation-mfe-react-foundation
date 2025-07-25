  export type Mfe1Instance = {
    unmount?: () => void;
  };

  export interface ServiceMfeApi {
  unmount: () => void;
  fetchItems: () => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string) => Promise<any[]>;
}