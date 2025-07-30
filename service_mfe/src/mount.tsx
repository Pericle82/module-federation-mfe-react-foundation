import React, { forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { useAPI } from './useApi';

export interface ServiceMfeApi {
  unmount: () => void;
  fetchItems: () => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string) => Promise<any[]>;
  // Event system for data synchronization
  onDataChange: (callback: (items: any[]) => void) => () => void; // Returns unsubscribe function
  loaders: {
    fetchItems: boolean;
    addItem: boolean;
    removeItem: boolean;
    filterItems: boolean;
  };
  errors: {
    fetchItems: string | null;
    addItem: string | null;
    removeItem: string | null;
    filterItems: string | null;
  };
}

const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

// Global event system for data synchronization
const dataChangeListeners = new Set<(items: any[]) => void>();

const notifyDataChange = async (getLatestItems: () => Promise<any[]>) => {
  try {
    const latestItems = await getLatestItems();
    dataChangeListeners.forEach(callback => {
      try {
        callback(latestItems);
      } catch (error) {
        console.error('Error in data change listener:', error);
      }
    });
  } catch (error) {
    console.error('Error getting latest items for notification:', error);
  }
};

export interface ServiceMfeMountProps {
  el: HTMLElement;
}

export function mount({el}: ServiceMfeMountProps): ServiceMfeApi {
  console.log('service_mfe mount function called with el:', el);
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
    const { loaders, errors, addItemHandler, removeItemHandler, fetchItemsHandler, filterItemsHandler } = useAPI();

    const api: ServiceMfeApi = React.useMemo(() => ({
      fetchItems: async () => {
        const items = await fetchItemsHandler();
        return items;
      },
      filterItems: async (query: string) => {
        const items = await filterItemsHandler(query);
        return items;
      },
      addItem: async (item: any) => {
        const items = await addItemHandler(item);
        // Notify all listeners about data change
        await notifyDataChange(fetchItemsHandler);
        return items ?? [];
      },
      removeItem: async (id: string) => {
        if (!id) {
          throw new Error('ID is required to remove an item');
        }
        const items = await removeItemHandler(id);
        // Notify all listeners about data change
        await notifyDataChange(fetchItemsHandler);
        return items;
      },
      onDataChange: (callback: (items: any[]) => void) => {
        dataChangeListeners.add(callback);
        // Return unsubscribe function
        return () => {
          dataChangeListeners.delete(callback);
        };
      },
      loaders,
      errors,
      unmount: () => { /* will be handled by mount() */ }
    }), [addItemHandler, removeItemHandler, fetchItemsHandler, filterItemsHandler, loaders, errors]);

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
    onDataChange: (callback: (items: any[]) => void) => {
      dataChangeListeners.add(callback);
      // Return unsubscribe function
      return () => {
        dataChangeListeners.delete(callback);
      };
    },
    get loaders() {
      return apiRef.current?.loaders || {
        fetchItems: false,
        addItem: false,
        removeItem: false,
        filterItems: false,
      };
    },
    get errors() {
      return apiRef.current?.errors || {
        fetchItems: null,
        addItem: null,
        removeItem: null,
        filterItems: null,
      };
    },
    unmount: () => {
      root!.unmount();
      roots.delete(el);
    }
  };
}