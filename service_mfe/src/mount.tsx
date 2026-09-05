import React, { useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { useAPI } from './useApi';

/**
 * service_mfe - the headless heart of the system
 * (COMPREHENSIVE_GUIDE.md § 4.2, § 5.1, § 5.6).
 *
 * It is two things at once:
 *
 *   - DATA LAYER: the only code that talks HTTP to the backend (through
 *     useApi/api.ts). No other micro-frontend has a URL in it.
 *   - MESSAGE BUS: module-level registries of listeners, so that any MFE can be
 *     told about a change made by any other MFE, without the two knowing each
 *     other. There are zero cross-imports between remotes.
 *
 * It has no UI: the container mounts it into a hidden <div> and keeps only the
 * object returned by `mount()`, which it then passes to every other remote as a
 * plain prop.
 *
 * The write path is deliberately not optimistic: a mutation POSTs/DELETEs, then
 * re-reads the whole collection and broadcasts it to everybody. The writer is
 * not privileged over the readers - all of them get the same array at the same
 * instant, and the backend stays the single source of truth (§ 5.4).
 */

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
  onDataChange: <T = any>(dataType: 'items' | 'users' | 'notifications', callback: (data: T) => void) => () => void; // Returns unsubscribe function
  // New: Allow MFEs to broadcast data changes
  notifyDataChange: (dataType: 'items' | 'users' | 'notifications', data: any) => void;
  // New: Loading state notifications
  onLoadingChange: (dataType: 'items' | 'users', callback: (isLoading: boolean, operation?: string) => void) => () => void;
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

// One React root per mount element. A WeakMap (not a Map) so that a detached
// node can be garbage collected instead of being kept alive by this cache.
const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

/**
 * THE BUS (§ 5.1). These live at *module* level - outside React, outside any
 * component - and that placement is the whole design:
 *
 *   1. webpack evaluates this module once and caches its namespace, so every
 *      caller talks to the same Sets even if mount() is called again. They are
 *      module singletons for the whole page.
 *   2. They survive re-renders of the component below: not being React state,
 *      nothing recreates them.
 *   3. They are NOT cleared when service_mfe unmounts - stale listeners would
 *      linger. It never happens today because Service_Mfe.tsx mounts once.
 *
 * `Set` rather than an array: O(1) removal makes unsubscribe trivial, and
 * duplicate callbacks are collapsed for free.
 */
const dataChangeListeners = {
  items: new Set<(data: any[]) => void>(),
  users: new Set<(data: any[]) => void>(),
  notifications: new Set<(data: any) => void>(),
};

// Same mechanism, different payload: (isLoading, operation) instead of data.
// It lets an MFE show that *another* MFE is writing (§ 5.7). NOTE: nobody
// subscribes to the `users` channel today - it fires into the void (§ 10.7).
const loadingChangeListeners = {
  items: new Set<(isLoading: boolean, operation?: string) => void>(),
  users: new Set<(isLoading: boolean, operation?: string) => void>(),
};

/**
 * Re-read from the backend, then push the fresh collection to every subscriber.
 * This is what closes the loop after a write (§ 6.2).
 *
 * NAME CLASH (§ 10.7): this module-level function and the API method called
 * `notifyDataChange` are two different things - this one goes over the network,
 * the API method is the direct in-memory `broadcastDataChange` below.
 */
const notifyDataChange = async <T = any>(
  dataType: 'items' | 'users',
  getLatestData: () => Promise<T[]>
) => {
  try {
    // Notify that we're starting to sync data
    notifyLoadingChange(dataType, true, 'dataSync');
    
    const latestData = await getLatestData();
    const listeners = dataChangeListeners[dataType];
    // Synchronous fan-out in registration order. Two things to know (§ 5.6):
    //   - every subscriber receives THE SAME array reference, so a listener
    //     that sorts or splices it corrupts the others - copy before mutating;
    //   - the per-callback try/catch isolates failures: one broken MFE cannot
    //     stop the others from being notified.
    listeners.forEach(callback => {
      try {
        callback(latestData);
      } catch (error) {
        console.error(`Error in ${dataType} data change listener:`, error);
      }
    });
    
    // Notify that data sync is complete
    notifyLoadingChange(dataType, false, 'dataSync');
  } catch (error) {
    console.error(`Error getting latest ${dataType} for notification:`, error);
    // Make sure to notify loading end even if there's an error
    notifyLoadingChange(dataType, false, 'dataSync');
  }
};

// Direct, in-memory publish - no HTTP involved. Used by notifications_mfe to
// republish its aggregated stats on the 'notifications' channel (§ 5.8).
// There is no cycle detection here: nothing stops a producer from subscribing
// to the channel it publishes on, so that has to be checked by hand.
const broadcastDataChange = (dataType: 'items' | 'users' | 'notifications', data: any) => {
  const listeners = dataChangeListeners[dataType];
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${dataType} data change listener:`, error);
      }
    });
  }
};

const notifyLoadingChange = (
  dataType: 'items' | 'users',
  isLoading: boolean,
  operation?: string
) => {
  const listeners = loadingChangeListeners[dataType];
  listeners.forEach(callback => {
    try {
      callback(isLoading, operation);
    } catch (error) {
      console.error(`Error in ${dataType} loading state listener:`, error);
    }
  });
};

export interface ServiceMfeMountProps {
  el: HTMLElement;
}

/**
 * The single exposed entry point of this remote.
 *
 * The awkward part it solves (§ 4.2): the container needs the API back
 * *synchronously*, but the handlers live inside a React component that mounts
 * asynchronously. The trick is a facade - this function returns immediately an
 * object whose every method does `const api = await apiReady; return api.x()`,
 * where `apiReady` is a Promise resolved by the inner component's effect.
 * Callers never notice the wait.
 */
export function mount({el}: ServiceMfeMountProps): ServiceMfeApi {
  console.log('service_mfe mount function called with el:', el);
  if (!el) throw new Error('Mount element is required');

  // Reuse the root if this element was already mounted, otherwise React
  // complains about creating a second root on the same container.
  let root = roots.get(el);
  if (!root) {
    root = ReactDOM.createRoot(el);
    roots.set(el, root);
  }

  // Read synchronously by the `loaders`/`errors` getters at the bottom.
  const apiRef = React.createRef<ServiceMfeApi>();
  
  // Use a promise-based approach to ensure ref is ready
  let apiReady: Promise<ServiceMfeApi>;
  let resolveApi: (api: ServiceMfeApi) => void;
  
  apiReady = new Promise((resolve) => {
    resolveApi = resolve;
  });

  // The real (invisible) component: it owns the HTTP handlers via useAPI and
  // builds the actual API object, then hands it to the facade by resolving
  // `apiReady`. It renders null - no UI, ever.
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
      // Write path, identical for the four mutations (§ 6.2):
      //   loading(true, '<op>') -> HTTP write -> re-read + broadcast -> loading(false)
      // The nested dataSync pair produced by notifyDataChange sits inside this
      // one, which is why mfe_2 observes: addItem:true, dataSync:true,
      // dataSync:false, addItem:false.
      addItem: async (item: any) => {
        try {
          // Notify loading start
          notifyLoadingChange('items', true, 'addItem');
          const items = await addItemHandler(item);
          // Notify all listeners about items data change
          await notifyDataChange('items', fetchItemsHandler);
          return items ?? [];
        } catch (error) {
          console.error('Error in addItem:', error);
          throw error;
        } finally {
          // Always notify loading end
          notifyLoadingChange('items', false, 'addItem');
        }
      },
      removeItem: async (id: string) => {
        if (!id) {
          throw new Error('ID is required to remove an item');
        }
        try {
          // Notify loading start
          notifyLoadingChange('items', true, 'removeItem');
          const items = await removeItemHandler(id);
          // Notify all listeners about items data change
          await notifyDataChange('items', fetchItemsHandler);
          return items;
        } catch (error) {
          console.error('Error in removeItem:', error);
          throw error;
        } finally {
          // Always notify loading end
          notifyLoadingChange('items', false, 'removeItem');
        }
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
        try {
          // Notify loading start
          notifyLoadingChange('users', true, 'addUser');
          const users = await addUserHandler(user);
          // Notify all listeners about users data change
          await notifyDataChange('users', fetchUsersHandler);
          return users ?? [];
        } catch (error) {
          console.error('Error in addUser:', error);
          throw error;
        } finally {
          // Always notify loading end
          notifyLoadingChange('users', false, 'addUser');
        }
      },
      removeUser: async (id: string) => {
        if (!id) {
          throw new Error('ID is required to remove a user');
        }
        try {
          // Notify loading start
          notifyLoadingChange('users', true, 'removeUser');
          const users = await removeUserHandler(id);
          // Notify all listeners about users data change
          await notifyDataChange('users', fetchUsersHandler);
          return users;
        } catch (error) {
          console.error('Error in removeUser:', error);
          throw error;
        } finally {
          // Always notify loading end
          notifyLoadingChange('users', false, 'removeUser');
        }
      },
      // Subscribe = add to the Set; the returned closure removes it again.
      // Remotes return this straight from a useEffect, so React unsubscribes
      // them on unmount with no cleanup code of their own (§ 5.2).
      onDataChange: <T = any>(dataType: 'items' | 'users' | 'notifications', callback: (data: T) => void) => {
        dataChangeListeners[dataType].add(callback as any);
        // Return unsubscribe function
        return () => {
          dataChangeListeners[dataType].delete(callback as any);
        };
      },
      notifyDataChange: (dataType: 'items' | 'users' | 'notifications', data: any) => {
        broadcastDataChange(dataType, data);
      },
      onLoadingChange: (dataType: 'items' | 'users', callback: (isLoading: boolean, operation?: string) => void) => {
        loadingChangeListeners[dataType].add(callback);
        // Return unsubscribe function
        return () => {
          loadingChangeListeners[dataType].delete(callback);
        };
      },
      // Plain snapshots of the React state held by useAPI. They are NOT
      // reactive across the boundary - see the getters at the end of the file.
      loaders,
      errors,
      unmount: () => { /* will be handled by mount() */ }
    }), [addItemHandler, removeItemHandler, fetchItemsHandler, filterItemsHandler, addUserHandler, removeUserHandler, fetchUsersHandler, filterUsersHandler, loaders, errors]);

    useImperativeHandle(ref, () => api, [api]);

    // Hands the real API to the facade. A Promise resolves only once, so later
    // runs of this effect (when `api` is rebuilt) are no-ops - the facade keeps
    // the first API object, which is fine because it reads everything it needs
    // through refs and module-level state.
    React.useEffect(() => {
      resolveApi!(api);
    }, [api]);

    return null; // no visible UI
  });

  root.render(<ServiceWithApiResolver ref={apiRef} />);

  // ---------------------------------------------------------------------
  // The synchronous facade returned to the container.
  // Data methods await `apiReady` and delegate; bus methods do not need the
  // component at all, because the registries are module-level - so a
  // subscription registered one microsecond after mount() already works.
  // ---------------------------------------------------------------------
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
    onDataChange: <T = any>(dataType: 'items' | 'users' | 'notifications', callback: (data: T) => void) => {
      const listeners = dataChangeListeners[dataType];
      listeners.add(callback as any);
      // Return unsubscribe function
      return () => {
        listeners.delete(callback as any);
      };
    },
    notifyDataChange: (dataType: 'items' | 'users' | 'notifications', data: any) => {
      broadcastDataChange(dataType, data);
    },
    onLoadingChange: (dataType: 'items' | 'users', callback: (isLoading: boolean, operation?: string) => void) => {
      const listeners = loadingChangeListeners[dataType];
      listeners.add(callback);
      // Return unsubscribe function
      return () => {
        listeners.delete(callback);
      };
    },
    // KNOWN ISSUE (§ 10.1): these are getters over a ref, i.e. a snapshot read
    // at render time with no subscription behind it. When the real loaders
    // change inside service_mfe nothing notifies the consuming remote, so the
    // "Adding item...", "Loading..." and error banners in mfe_1 and users_mfe
    // never appear. The working mechanism is onLoadingChange (§ 5.7); the fix
    // is to consume that (or expose these via useSyncExternalStore).
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
    // Tears down the React tree and forgets the root. NOTE: the bus registries
    // are module-level and are deliberately left untouched - see § 5.1.
    unmount: () => {
      root!.unmount();
      roots.delete(el);
    }
  };
}