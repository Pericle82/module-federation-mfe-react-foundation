import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useItemsFilter - state layer of MFE_2 (filtered view over the shared items).
 *
 * MFE_2 is a *reader* of the 'items' dataset owned by the host: it never
 * mutates it, it only keeps a filtered projection of it.
 *
 * Two lists are kept on purpose:
 *   - `items`         : the full dataset, always in sync with the host;
 *   - `filteredItems` : what the UI renders, i.e. `items` narrowed by the
 *                       filter that was last *applied* (`currentFilter`).
 *
 * And two filter strings, so typing does not re-filter on every keystroke:
 *   - `filter`        : the current input value (draft);
 *   - `currentFilter` : the value actually applied, used to re-filter incoming
 *                       broadcasts so the view stays consistent.
 */

interface UseItemsFilterProps {
  /** Shared API exposed by the host. Undefined until the host has wired it up. */
  serviceApi?: any;
}

export interface UseItemsFilterReturn {
  items: any[];
  /** Draft value of the filter input (not applied yet). */
  filter: string;
  /** Filter currently applied to `filteredItems`; "" means "no filter". */
  currentFilter: string;
  filteredItems: any[];
  /** True while *another* MFE is running an items operation (add/remove/...). */
  externalLoading: boolean;
  /** Name of that operation, for the loading message. */
  loadingOperation: string;
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilter: () => void;
  clearFilter: () => void;
  /** Aggregated stats broadcast by notifications_mfe (null until it publishes). */
  notificationStats: any;
}

export const useItemsFilter = ({ serviceApi }: UseItemsFilterProps): UseItemsFilterReturn => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [currentFilter, setCurrentFilter] = useState("");
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [externalLoading, setExternalLoading] = useState(false); // Loading state from external operations
  const [loadingOperation, setLoadingOperation] = useState<string>(""); // Track which operation is loading
  const [notificationStats, setNotificationStats] = useState<any>(null);

  // Set as soon as a broadcast delivers items, so a slower initial fetch knows
  // its result is already stale and must not overwrite the newer data.
  const gotBroadcastRef = useRef(false);

  // Fetch items when component mounts or serviceApi becomes available
  useEffect(() => {
    // Guard against setting state after unmount (or after serviceApi changed).
    let cancelled = false;
    gotBroadcastRef.current = false;

    const fetchItems = async () => {
      if (serviceApi?.fetchItems) {
        try {
          const result = await serviceApi.fetchItems();
          // Drop the response if we unmounted meanwhile, or if a broadcast has
          // already delivered a fresher list while this request was in flight.
          if (cancelled || gotBroadcastRef.current) return;
          // No filter can be active on first load, so both lists start equal.
          setItems(result);
          setFilteredItems(result);
        } catch (error) {
          console.error('Failed to fetch items:', error);
        }
      }
    };

    fetchItems();

    return () => { cancelled = true; };
  }, [serviceApi]);

  // Loading is broadcast by the host as well, so this MFE can show a spinner
  // for operations started elsewhere (e.g. an item added from MFE_1).
  useEffect(() => {
    if (!serviceApi?.onLoadingChange) return;

    const unsubscribe = serviceApi.onLoadingChange('items', (isLoading: boolean, operation?: string) => {
      console.log(`MFE_2 received loading notification: ${operation} - ${isLoading ? 'STARTED' : 'FINISHED'}`);
      setExternalLoading(isLoading);
      setLoadingOperation(operation || "");
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi]);

  // Subscribe to data changes - specifically listen to 'items' data type.
  // Re-runs when `currentFilter` changes so the callback always closes over the
  // filter in force, otherwise a broadcast would silently drop the filtering.
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('items', (updatedItems: any[]) => {
      console.log('MFE_2 received items data change notification:', updatedItems);
      gotBroadcastRef.current = true;
      setItems(updatedItems);

      // If no filter is active, show all items
      if (!currentFilter) {
        setFilteredItems(updatedItems);
      } else {
        // Re-apply current filter to new data. Done locally (not via
        // serviceApi.filterItems) to keep the update synchronous with the
        // broadcast and avoid an extra round trip on every change.
        const refiltered = updatedItems.filter(item =>
          item.name?.toLowerCase().includes(currentFilter.toLowerCase())
        );
        setFilteredItems(refiltered);
      }
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi, currentFilter]);

  // Read-only channel: notifications_mfe aggregates counters for the whole app
  // and republishes them on the 'notifications' channel. We only display them.
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('notifications', (stats: any) => {
      console.log('MFE_2 received notification stats:', stats);
      setNotificationStats(stats);
    });

    return unsubscribe;
  }, [serviceApi]);

  /** Updates the draft only - filtering happens on `applyFilter`. */
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, []);

  const applyFilter = useCallback(async () => {
    // An empty/whitespace filter means "show everything": reset locally without
    // hitting the service.
    if (!filter.trim()) {
      setCurrentFilter("");
      setFilteredItems(items);
      return;
    }

    if (!serviceApi?.filterItems) return;

    try {
      // The first filtering pass is delegated to the host (server-side search);
      // later refreshes are re-filtered locally in the broadcast handler above.
      const filteredResult = await serviceApi.filterItems(filter);
      setFilteredItems(filteredResult);
      setCurrentFilter(filter);
    } catch (error) {
      console.error('Error filtering items:', error);
    }
  }, [filter, serviceApi, items]);

  /** Clears both draft and applied filter and restores the full list. */
  const clearFilter = useCallback(() => {
    setFilter("");
    setCurrentFilter("");
    setFilteredItems(items);
  }, [items]);

  return {
    items,
    filter,
    currentFilter,
    filteredItems,
    externalLoading,
    loadingOperation,
    handleFilterChange,
    applyFilter,
    clearFilter,
    notificationStats,
  };
};
