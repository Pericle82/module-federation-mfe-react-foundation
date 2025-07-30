import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

type Mf2AppProps = {
  serviceApi?: any; // Service API with loaders, errors, and methods
};

const Mf2App: React.FC<Mf2AppProps> = (props) => {
  const { serviceApi } = props;
  
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

  // Subscribe to data changes
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange((updatedItems: any[]) => {
      console.log('MFE_2 received data change notification:', updatedItems);
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

  return (
    <div style={{ border: '2px solid #007bff', padding: 16, borderRadius: 8, margin: 8 }}>
      <h2>MF 2 - Filtro Items</h2>
      
      {/* Loading states */}
      {loaders.fetchItems && <p style={{ color: 'blue' }}>Loading items...</p>}
      {loaders.filterItems && <p style={{ color: 'blue' }}>Filtering items...</p>}
      
      {/* Error states */}
      {errors.fetchItems && <p style={{ color: 'red' }}>Error loading items: {errors.fetchItems}</p>}
      {errors.filterItems && <p style={{ color: 'red' }}>Error filtering items: {errors.filterItems}</p>}
      
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filtra items..."
        style={{ marginRight: 8 }}
      />

      <button 
        onClick={() => handleFilterReset()} 
        disabled={loaders.filterItems}
      >
        Resetta Filtro
      </button>
      <span style={{ marginLeft: 8 }}>Filtro attuale: {currentFilter || 'Nessuno'}</span>
      <br />
      <button
        onClick={handleFilter}
        disabled={loaders.filterItems || !filter.trim()}
      >
        Filtra
      </button>
      
      <ul>
        {filteredItems?.map((item: any) => (
          <li key={item.id}>{item.name || JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};

const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

interface mf2MountProps {
  el: HTMLElement;
  serviceApi?: any; // Service API with loaders, errors, and methods
}

export function mount({el, serviceApi}: mf2MountProps): { 
  unmount: () => void; 
  updateProps: (props: { serviceApi?: any }) => void 
} {
  let root = roots.get(el);
  if (!root) {
    root = ReactDOM.createRoot(el);
    roots.set(el, root);
  }
  
  let currentProps = { serviceApi };
  
  const render = () => {
    root!.render(<Mf2App {...currentProps} />);
  };
  
  render(); // Initial render

  return {
    updateProps: (newProps: { serviceApi?: any }) => {
      currentProps = { ...currentProps, ...newProps };
      render();
    },
    unmount: () => {
      root?.unmount();
      roots.delete(el);
    }
  };
}
