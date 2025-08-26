import { useCallback, useEffect, useState } from 'react';

interface UseItemsProps {
  serviceApi?: any;
}

interface UseItemsReturn {
  items: any[];
  newItem: string;
  setNewItem: (value: string) => void;
  handleAdd: () => Promise<void>;
  handleRemove: (id: string | number) => Promise<void>;
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
  notificationStats: any; // NEW: Notification stats from notifications_mfe
}

export const useItems = ({ serviceApi }: UseItemsProps): UseItemsReturn => {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [notificationStats, setNotificationStats] = useState<any>(null);

  // Fetch items when component mounts or serviceApi becomes available
  useEffect(() => {
    const fetchItems = async () => {
      if (serviceApi?.fetchItems) {
        try {
          const result = await serviceApi.fetchItems();
          setItems(result);
        } catch (error) {
          console.error('Failed to fetch items:', error);
        }
      }
    };

    fetchItems();
  }, [serviceApi]);

  // Subscribe to data changes - specifically listen to 'items' data type
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('items', (updatedItems: any[]) => {
      console.log('MFE_1 received items data change notification:', updatedItems);
      setItems(updatedItems);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi]);

  // NEW: Subscribe to notifications from notifications_mfe
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('notifications', (stats: any) => {
      console.log('MFE_1 received notification stats:', stats);
      setNotificationStats(stats);
    });

    return unsubscribe;
  }, [serviceApi]);

  const handleAdd = useCallback(async () => {
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

  // Get loading and error states from service API
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
    notificationStats, // NEW: Expose notification stats
  };
};
