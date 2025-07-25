import React, { createContext, useContext, useRef, useEffect, useState, ReactNode, useCallback } from 'react';
import { ServiceApi, useServiceMfe } from './useService';

type ServiceContextType = {
  serviceApi: ServiceApi | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  items: any[];
  setItems: (items: any[]) => void;
  // Convenience methods
  fetchItems: () => Promise<any[]>;
  addItem: (item: any) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  filterItems: (query: string) => Promise<any[]>;
};

const ServiceContext = createContext<ServiceContextType | null>(null);

type ServiceProviderProps = {
  children: ReactNode;
};

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  const serviceRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceApi = useServiceMfe(serviceRef);

  // Check if service is ready or failed to load
  useEffect(() => {
    if (serviceApi && !isReady) {
      setIsReady(true);
    } else if (!serviceApi && !isReady) {
      // If serviceApi is null after some time, set error
      setError('Service MFE failed to load or is unavailable');
    }
  }, [serviceApi, isReady]);

  // Auto-fetch items when service becomes ready
  useEffect(() => {
    if (!serviceApi || !serviceApi.fetchItems || !isReady || items.length !== 0) return;
    setIsLoading(true);
    setError(null);
    serviceApi.fetchItems()
      .then((fetchedItems) => {
        setItems(fetchedItems); 
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching items:', err);
        setError(err.message || 'Failed to fetch items');
        setIsLoading(false);
      });
  }, [serviceApi, isReady, items.length]);

  // Convenience methods that wrap the serviceApi methods
  const fetchItems = useCallback(async (): Promise<any[]> => {
    if (!serviceApi || !serviceApi.fetchItems) {
      console.warn('fetchItems called before serviceApi is ready');
      setError('Service API not ready');
      setIsLoading(false);
      return Promise.reject(new Error('Service API not ready'));
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await serviceApi.fetchItems();
      setItems(result);
      setIsLoading(false);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
      setIsLoading(false);
      throw err;
    }
  }, [serviceApi]);

  const addItem = useCallback(async (item: any): Promise<void> => {
    if (!serviceApi || !serviceApi.addItem) {
      console.warn('addItem called before serviceApi is ready');
      setError('Service API not ready');
      return Promise.reject(new Error('Service API not ready'));
    }
    try {
      await serviceApi.addItem(item);
      // Refresh items after adding
      await fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      throw err;
    }
  }, [serviceApi, fetchItems]);

  const removeItem = useCallback(async (id: string): Promise<void> => {
    if (!serviceApi || !serviceApi.removeItem) {
      console.warn('removeItem called before serviceApi is ready');
      setError('Service API not ready');
      return Promise.reject(new Error('Service API not ready'));
    }
    try {
      await serviceApi.removeItem(id);
      // Refresh items after removing
      await fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
      throw err;
    }
  }, [serviceApi, fetchItems]);

  const filterItems = useCallback(async (query: string): Promise<any[]> => {
    if (!serviceApi || !serviceApi.filterItems) {
      console.warn('filterItems called before serviceApi is ready');
      setError('Service API not ready');
      return Promise.reject(new Error('Service API not ready'));
    }
    try {
      const result = await serviceApi.filterItems(query);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to filter items');
      throw err;
    }
  }, [serviceApi]);

  const contextValue: ServiceContextType = {
    serviceApi,
    isReady,
    isLoading,
    error,
    items,
    setItems,
    fetchItems,
    addItem,
    removeItem,
    filterItems,
  };

  return (
    <ServiceContext.Provider value={contextValue}>
      <div ref={serviceRef} style={{ display: 'none' }} /> {/* Hidden if you don't want UI */}
      {children}
    </ServiceContext.Provider>
  );
};

// Custom hook to use the service context
export const useService = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};

// Export individual service functions for convenience
export const useServiceFunctions = () => {
  const { fetchItems, addItem, removeItem, filterItems } = useService();
  return {
    fetchItems,
    addItem,
    removeItem,
    filterItems,
  };
};

// Hook for service state
export const useServiceState = () => {
  const { items, isReady, isLoading, error } = useService();
  return {
    items,
    isReady,
    isLoading,
    error,
  };
};
