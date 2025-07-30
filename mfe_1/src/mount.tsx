
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

type MF1props = {
  serviceApi?: any; // Service API with loaders, errors, and methods
};

const Mfe1App: React.FC<MF1props> = (props) => {
  const { serviceApi } = props;
  
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");

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

  // Subscribe to data changes
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange((updatedItems: any[]) => {
      console.log('MFE_1 received data change notification:', updatedItems);
      setItems(updatedItems);
    });

    return unsubscribe; // Cleanup subscription on unmount
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

  return (
    <div style={{ border: '2px solid #764ba2', borderRadius: 8, padding: 16, margin: 16 }}>
      <h2>mfe_1 Micro-Frontend</h2>
      
      {/* Loading states */}
      {loaders.fetchItems && <p style={{ color: 'blue' }}>Loading items...</p>}
      {loaders.addItem && <p style={{ color: 'blue' }}>Adding item...</p>}
      {loaders.removeItem && <p style={{ color: 'blue' }}>Removing item...</p>}
      
      {/* Error states */}
      {errors.fetchItems && <p style={{ color: 'red' }}>Error loading items: {errors.fetchItems}</p>}
      {errors.addItem && <p style={{ color: 'red' }}>Error adding item: {errors.addItem}</p>}
      {errors.removeItem && <p style={{ color: 'red' }}>Error removing item: {errors.removeItem}</p>}
      
      <ul>
        {items?.map((item: any) => (
          <li key={item.id}>
            {item.name || JSON.stringify(item)}
            <button 
              style={{ marginLeft: 8 }} 
              onClick={() => handleRemove(item.id)}
              disabled={loaders.removeItem}
            >
              Elimina
            </button>
          </li>
        ))}
      </ul>
      
      <input
        type="text"
        value={newItem}
        onChange={e => setNewItem(e.target.value)}
        placeholder="Nuovo oggetto"
      />
      <button 
        onClick={handleAdd} 
        disabled={loaders.addItem || !newItem.trim()}
      >
        Aggiungi
      </button>
    </div>
  );
};


// At module scope
const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

interface mf1MountProps {
  el: HTMLElement;
  serviceApi?: any; // Service API with loaders, errors, and methods
}

export function unmount(el: HTMLElement) {
  const root = roots.get(el);
  if (root) {
    root.unmount();
    roots.delete(el);
  }
}

export function mount({el, serviceApi}: mf1MountProps): {
  unmount: () => void;
} {
  let root = roots.get(el);
  if (!root) {
    root = ReactDOM.createRoot(el);
    roots.set(el, root);
  }
  
  root.render(<Mfe1App serviceApi={serviceApi} />);
  
  return {
    unmount: () => {
      root?.unmount();
      roots.delete(el);
    }
  };
}