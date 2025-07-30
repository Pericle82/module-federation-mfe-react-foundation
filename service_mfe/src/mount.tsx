import React, { forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { useAPI } from './useApi';

export interface ServiceMfeApi {
  unmount: () => void;
  // Items operations
  fetchItems: () => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string) => Promise<any[]>;
  // Users operations
  fetchUsers: () => Promise<any[]>;
  filterUsers: (query: string) => Promise<any[]>;
  addUser: (user: any) => Promise<any[]>;
  removeUser: (id: string) => Promise<any[]>;
  // Event system for data synchronization with data type specificity
  onDataChange: <T = any>(dataType: 'items' | 'users', callback: (data: T[]) => void) => () => void; // Returns unsubscribe function
  loaders: {
    fetchItems: boolean;
    addItem: boolean;
    removeItem: boolean;
    filterItems: boolean;
    fetchUsers: boolean;
    addUser: boolean;
    removeUser: boolean;
    filterUsers: boolean;
  };
  errors: {
    fetchItems: string | null;
    addItem: string | null;
    removeItem: string | null;
    filterItems: string | null;
    fetchUsers: string | null;
    addUser: string | null;
    removeUser: string | null;
    filterUsers: string | null;
  };
}

const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

// Global event system for data synchronization with data type specificity
const dataChangeListeners = {
  items: new Set<(data: any[]) => void>(),
  users: new Set<(data: any[]) => void>(),
};

const notifyDataChange = async <T = any>(
  dataType: 'items' | 'users',
  getLatestData: () => Promise<T[]>
) => {
  try {
    const latestData = await getLatestData();
    const listeners = dataChangeListeners[dataType];
    listeners.forEach(callback => {
      try {
        callback(latestData);
      } catch (error) {
        console.error(`Error in ${dataType} data change listener:`, error);
      }
    });
  } catch (error) {
    console.error(`Error getting latest ${dataType} for notification:`, error);
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
    const { loaders, errors, addItemHandler, removeItemHandler, fetchItemsHandler, filterItemsHandler, addUserHandler, removeUserHandler, fetchUsersHandler, filterUsersHandler } = useAPI();

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
        // Notify all listeners about items data change
        await notifyDataChange('items', fetchItemsHandler);
        return items ?? [];
      },
      removeItem: async (id: string) => {
        if (!id) {
          throw new Error('ID is required to remove an item');
        }
        const items = await removeItemHandler(id);
        // Notify all listeners about items data change
        await notifyDataChange('items', fetchItemsHandler);
        return items;
      },
      fetchUsers: async () => {
        const users = await fetchUsersHandler();
        return users;
      },
      filterUsers: async (query: string) => {
        const users = await filterUsersHandler(query);
        return users;
      },
      addUser: async (user: any) => {
        const users = await addUserHandler(user);
        // Notify all listeners about users data change
        await notifyDataChange('users', fetchUsersHandler);
        return users ?? [];
      },
      removeUser: async (id: string) => {
        if (!id) {
          throw new Error('ID is required to remove a user');
        }
        const users = await removeUserHandler(id);
        // Notify all listeners about users data change
        await notifyDataChange('users', fetchUsersHandler);
        return users;
      },
      onDataChange: <T = any>(dataType: 'items' | 'users', callback: (data: T[]) => void) => {
        dataChangeListeners[dataType].add(callback as any);
        // Return unsubscribe function
        return () => {
          dataChangeListeners[dataType].delete(callback as any);
        };
      },
      loaders,
      errors,
      unmount: () => { /* will be handled by mount() */ }
    }), [addItemHandler, removeItemHandler, fetchItemsHandler, filterItemsHandler, addUserHandler, removeUserHandler, fetchUsersHandler, filterUsersHandler, loaders, errors]);

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
    fetchUsers: async () => {
      const api = await apiReady;
      return api.fetchUsers();
    },
    filterUsers: async (q: string) => {
      const api = await apiReady;
      return api.filterUsers(q);
    },
    addUser: async (u: any) => {
      const api = await apiReady;
      return api.addUser(u);
    },
    removeUser: async (i: string) => {
      const api = await apiReady;
      return api.removeUser(i);
    },
    onDataChange: <T = any>(dataType: 'items' | 'users', callback: (data: T[]) => void) => {
      dataChangeListeners[dataType].add(callback as any);
      // Return unsubscribe function
      return () => {
        dataChangeListeners[dataType].delete(callback as any);
      };
    },
    get loaders() {
      return apiRef.current?.loaders || {
        fetchItems: false,
        addItem: false,
        removeItem: false,
        filterItems: false,
        fetchUsers: false,
        addUser: false,
        removeUser: false,
        filterUsers: false,
      };
    },
    get errors() {
      return apiRef.current?.errors || {
        fetchItems: null,
        addItem: null,
        removeItem: null,
        filterItems: null,
        fetchUsers: null,
        addUser: null,
        removeUser: null,
        filterUsers: null,
      };
    },
    unmount: () => {
      root!.unmount();
      roots.delete(el);
    }
  };
}