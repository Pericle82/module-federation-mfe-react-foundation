import React, { forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { useAPI } from './useApi';
import { filterItems as apiFilter } from './api';

export interface ServiceMfeApi {
  unmount: () => void;
  fetchItems: () => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string) => Promise<any[]>;
}

const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

// 1) wrapper component that calls the hook
const ServiceWithApi = forwardRef<ServiceMfeApi>((_, ref) => {
  const { loaders, addItemHandler, removeItemHandler, fetchItemsHandler } = useAPI();

  useImperativeHandle(ref, () => ({
    fetchItems: async () => {
      const items = await fetchItemsHandler();
      return items;
    },
    filterItems: async (query: string) => {
      if (!query) {
        return fetchItemsHandler(); // Return all items if no query
      }
      const items = await apiFilter(query);
      return items;
    },
    addItem: async (item: any) => {
      const items = await addItemHandler(item);
      return items ?? [];
    },
    removeItem: async (id: string) => {
      if (!id) {
        throw new Error('ID is required to remove an item');
      }
      const items = await removeItemHandler(id);
      return items;
    },
    unmount: () => { /* will be handled by mount() */ }
  }), [addItemHandler, removeItemHandler, fetchItemsHandler]);

  return null; // no visible UI
});


export function mount(el: HTMLElement): ServiceMfeApi {
  if (!el) throw new Error('Mount element is required');

  let root = roots.get(el);
  if (!root) {
    root = ReactDOM.createRoot(el);
    roots.set(el, root);
  }

  const apiRef = React.createRef<ServiceMfeApi>();
  
  // Use a promise-based approach to ensure ref is ready
  let apiReady: Promise<ServiceMfeApi>;
  let resolveApi: (api: ServiceMfeApi) => void;
  
  apiReady = new Promise((resolve) => {
    resolveApi = resolve;
  });

  // Custom component that resolves the promise when ref is set
  const ServiceWithApiResolver = React.forwardRef<ServiceMfeApi>((_, ref) => {
    const { loaders, addItemHandler, removeItemHandler, fetchItemsHandler } = useAPI();

    const api: ServiceMfeApi = React.useMemo(() => ({
      fetchItems: async () => {
        const items = await fetchItemsHandler();
        return items;
      },
      filterItems: async (query: string) => {
        if (!query) {
          return fetchItemsHandler(); // Return all items if no query
        }
        const items = await apiFilter(query);
        return items;
      },
      addItem: async (item: any) => {
        const items = await addItemHandler(item);
        return items ?? [];
      },
      removeItem: async (id: string) => {
        if (!id) {
          throw new Error('ID is required to remove an item');
        }
        const items = await removeItemHandler(id);
        return items;
      },
      unmount: () => { /* will be handled by mount() */ }
    }), [addItemHandler, removeItemHandler, fetchItemsHandler]);

    useImperativeHandle(ref, () => api, [api]);

    // Resolve the promise when component mounts
    React.useEffect(() => {
      resolveApi!(api);
    }, [api]);

    return null; // no visible UI
  });

  root.render(<ServiceWithApiResolver ref={apiRef} />);

  return {
    fetchItems: async () => {
      const api = await apiReady;
      return api.fetchItems();
    },
    filterItems: async (q: string) => {
      const api = await apiReady;
      return api.filterItems(q);
    },
    addItem: async (i: any) => {
      const api = await apiReady;
      return api.addItem(i);
    },
    removeItem: async (i: string) => {
      const api = await apiReady;
      return api.removeItem(i);
    },
    unmount: () => {
      root!.unmount();
      roots.delete(el);
    }
  };
}