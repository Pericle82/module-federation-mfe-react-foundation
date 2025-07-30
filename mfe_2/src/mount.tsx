import React from 'react';
import { useItemsFilter } from './useItemsFilter';
import { mountUtils } from './useMount';

type Mf2AppProps = {
  serviceApi?: any; // Service API with loaders, errors, and methods
};

const Mf2App: React.FC<Mf2AppProps> = (props) => {
  const { serviceApi } = props;
  
  const {
    items,
    filteredItems,
    filter,
    currentFilter,
    setFilter,
    handleFilter,
    handleFilterReset,
    loaders,
    errors,
  } = useItemsFilter({ serviceApi });

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

// Mount interface  
interface mf2MountProps {
  el: HTMLElement;
  serviceApi?: any;
}

// Export mount function using the utility
export function mount({el, serviceApi}: mf2MountProps): { 
  unmount: () => void; 
  updateProps: (props: { serviceApi?: any }) => void 
} {
  const mountResult = mountUtils.render(el, <Mf2App serviceApi={serviceApi} />);
  
  return {
    updateProps: (newProps: { serviceApi?: any }) => {
      // Re-render with new props
      mountUtils.render(el, <Mf2App {...newProps} />);
    },
    unmount: mountResult.unmount
  };
}
