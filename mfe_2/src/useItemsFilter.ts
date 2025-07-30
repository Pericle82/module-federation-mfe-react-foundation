import { useCallback, useEffect, useState } from 'react';

interface UseItemsFilterProps {
  serviceApi?: any;
}

export interface UseItemsFilterReturn {
  items: any[];
  filter: string;
  currentFilter: string;
  filteredItems: any[];
  externalLoading: boolean; // Loading state from external operations
  loadingOperation: string; // Track which operation is loading
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilter: () => void;
  clearFilter: () => void;
}

export const useItemsFilter = ({ serviceApi }: UseItemsFilterProps): UseItemsFilterReturn => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [currentFilter, setCurrentFilter] = useState("");
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [externalLoading, setExternalLoading] = useState(false); // Loading state from external operations
  const [loadingOperation, setLoadingOperation] = useState<string>(""); // Track which operation is loading

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

  // Subscribe to loading state changes from external operations
  useEffect(() => {
    if (!serviceApi?.onLoadingChange) return;

    const unsubscribe = serviceApi.onLoadingChange('items', (isLoading: boolean, operation?: string) => {
      console.log(`MFE_2 received loading notification: ${operation} - ${isLoading ? 'STARTED' : 'FINISHED'}`);
      setExternalLoading(isLoading);
      setLoadingOperation(operation || "");
    });

    return unsubscribe; // Cleanup subscription on unmount
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

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, []);

  const applyFilter = useCallback(async () => {
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
    clearFilter
  };
};
