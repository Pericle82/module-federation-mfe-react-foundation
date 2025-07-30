
import React from 'react';
import { useItems } from './useItems';
import { mountUtils } from './useMount';

type MF1props = {
  serviceApi?: any; // Service API with loaders, errors, and methods
};

const Mfe1App: React.FC<MF1props> = (props) => {
  const { serviceApi } = props;
  
  const {
    items,
    newItem,
    setNewItem,
    handleAdd,
    handleRemove,
    loaders,
    errors,
  } = useItems({ serviceApi });

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

// Mount interface
interface mf1MountProps {
  el: HTMLElement;
  serviceApi?: any;
}

// Export mount and unmount functions using the utility
export function mount({el, serviceApi}: mf1MountProps): { unmount: () => void } {
  return mountUtils.render(el, <Mfe1App serviceApi={serviceApi} />);
}

export function unmount(el: HTMLElement) {
  mountUtils.unmount(el);
}