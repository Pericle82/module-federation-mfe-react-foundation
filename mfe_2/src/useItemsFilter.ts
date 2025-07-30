import { useCallback, useEffect, useState } from 'react';

interface UseItemsFilterProps {
  serviceApi?: any;
}

interface UseItemsFilterReturn {
  items: any[];
  filteredItems: any[];
  filter: string;
  currentFilter: string;
  setFilter: (value: string) => void;
  handleFilter: () => Promise<void>;
  handleFilterReset: () => void;
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

export const useItemsFilter = ({ serviceApi }: UseItemsFilterProps): UseItemsFilterReturn => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [currentFilter, setCurrentFilter] = useState("");
  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  // Fetch items when component mounts or serviceApi becomes available
  useEffect(() => {
    const fetchItems = async () => {
      if (serviceApi?.fetchItems) {
        try {
          const result = await serviceApi.fetchItems();
          setItems(result);
          setFilteredItems(result);
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
      console.log('MFE_2 received items data change notification:', updatedItems);
      setItems(updatedItems);
      
      // If no filter is active, show all items
      if (!currentFilter) {
        setFilteredItems(updatedItems);
      } else {
        // Re-apply current filter to new data
        const refiltered = updatedItems.filter(item => 
          item.name?.toLowerCase().includes(currentFilter.toLowerCase())
        );
        setFilteredItems(refiltered);
      }
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi, currentFilter]);

  const handleFilter = useCallback(async () => {
    if (!filter.trim()) {
      setCurrentFilter("");
      setFilteredItems(items);
      return;
    }
    
    if (!serviceApi?.filterItems) return;
    
    try {
      const filteredResult = await serviceApi.filterItems(filter);
      setFilteredItems(filteredResult);
      setCurrentFilter(filter);
    } catch (error) {
      console.error('Error filtering items:', error);
    }
  }, [filter, serviceApi, items]);

  const handleFilterReset = useCallback(() => {
    setFilter("");
    setCurrentFilter("");
    setFilteredItems(items);
  }, [items]);

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
    filteredItems,
    filter,
    currentFilter,
    setFilter,
    handleFilter,
    handleFilterReset,
    loaders,
    errors,
  };
};
