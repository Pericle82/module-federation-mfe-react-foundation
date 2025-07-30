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
    externalLoading,
    loadingOperation,
    handleFilterChange,
    applyFilter,
    clearFilter,
  } = useItemsFilter({ serviceApi });

  const getLoadingMessage = (operation: string) => {
    switch (operation) {
      case 'addItem':
        return '➕ Adding new item...';
      case 'removeItem':
        return '🗑️ Removing item...';
      case 'dataSync':
        return '🔄 Syncing data...';
      default:
        return '🔄 Another MFE is performing operations...';
    }
  };

  return (
    <div style={{ border: '2px solid #007bff', padding: 16, borderRadius: 8, margin: 8 }}>
      <h2>MF 2 - Filtro Items</h2>
      
      {/* External loading state (from other MFEs) */}
      {externalLoading && (
        <div style={{ 
          color: 'orange', 
          fontWeight: 'bold', 
          background: '#fff3cd', 
          padding: '8px', 
          borderRadius: '4px',
          margin: '8px 0',
          border: '1px solid #ffeaa7'
        }}>
          {getLoadingMessage(loadingOperation)}
        </div>
      )}
      
      <input
        type="text"
        value={filter}
        onChange={handleFilterChange}
        placeholder="Filtra items..."
        style={{ marginRight: 8 }}
      />

      <button 
        onClick={clearFilter}
        disabled={externalLoading}
      >
        Resetta Filtro
      </button>
      <span style={{ marginLeft: 8 }}>Filtro attuale: {currentFilter || 'Nessuno'}</span>
      <br />
      <button
        onClick={applyFilter}
        disabled={externalLoading || !filter.trim()}
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
