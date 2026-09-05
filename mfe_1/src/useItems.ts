import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useItems - state layer of MFE_1 (items list).
 *
 * This MFE owns no data of its own: every read and write goes through the
 * `serviceApi` object injected by the host application. The data flow is
 * one-way and event based:
 *
 *   1. on mount we ask the host for the current items (`fetchItems`);
 *   2. mutations (`addItem` / `removeItem`) are only *requests* sent to the host;
 *   3. the resulting new list comes back to every MFE through the
 *      `onDataChange('items')` broadcast, which is what actually updates state.
 *
 * That is why the mutation handlers below never call `setItems` themselves.
 */

interface UseItemsProps {
  /** Shared API exposed by the host. Undefined until the host has wired it up. */
  serviceApi?: any;
}

interface UseItemsReturn {
  items: any[];
  newItem: string;
  setNewItem: (value: string) => void;
  handleAdd: () => Promise<void>;
  handleRemove: (id: string | number) => Promise<void>;
  /** Per-operation loading flags, owned by the host service. */
  loaders: {
    fetchItems: boolean;
    addItem: boolean;
    removeItem: boolean;
    filterItems: boolean;
  };
  /** Per-operation error messages, owned by the host service. */
  errors: {
    fetchItems: string | null;
    addItem: string | null;
    removeItem: string | null;
    filterItems: string | null;
  };
  /** Aggregated stats broadcast by notifications_mfe (null until it publishes). */
  notificationStats: any;
}

export const useItems = ({ serviceApi }: UseItemsProps): UseItemsReturn => {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
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
          if (!cancelled && !gotBroadcastRef.current) setItems(result);
        } catch (error) {
          console.error('Failed to fetch items:', error);
        }
      }
    };

    fetchItems();

    return () => { cancelled = true; };
  }, [serviceApi]);

  // Subscribe to data changes - specifically listen to 'items' data type.
  // This is the single source of truth for `items` after the first load: any
  // MFE mutating items makes the host re-broadcast the whole list here.
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('items', (updatedItems: any[]) => {
      console.log('MFE_1 received items data change notification:', updatedItems);
      gotBroadcastRef.current = true;
      setItems(updatedItems);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi]);

  // Read-only channel: notifications_mfe aggregates counters for the whole app
  // and republishes them on the 'notifications' channel. We only display them.
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('notifications', (stats: any) => {
      console.log('MFE_1 received notification stats:', stats);
      setNotificationStats(stats);
    });

    return unsubscribe;
  }, [serviceApi]);

  const handleAdd = useCallback(async () => {
    // Ignore empty input, and no-op while the host API is not available yet.
    if (!newItem.trim() || !serviceApi?.addItem) return;

    try {
      await serviceApi.addItem(newItem);
      setNewItem("");
      // Note: Items will be updated via onDataChange notification
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }, [newItem, serviceApi]);

  const handleRemove = useCallback(async (id: string | number) => {
    if (!serviceApi?.removeItem) return;

    try {
      await serviceApi.removeItem(id);
      // Note: Items will be updated via onDataChange notification
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }, [serviceApi]);

  // Loading/error state lives in the host service so that every MFE sees the
  // same status. The literals below are just the "host not ready yet" fallback,
  // which keeps the UI from having to null-check these objects.
  const loaders = serviceApi?.loaders || {
    fetchItems: false,
    addItem: false,
    removeItem: false,
    filterItems: false,
  };

  const errors = serviceApi?.errors || {
    fetchItems: null,
    addItem: null,
    removeItem: null,
    filterItems: null,
  };

  return {
    items,
    newItem,
    setNewItem,
    handleAdd,
    handleRemove,
    loaders,
    errors,
    notificationStats,
  };
};
