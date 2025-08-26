import React from 'react';
import { useItemsFilter } from './useItemsFilter';
import { mountUtils } from './useMount';
import {
  MfeContainer,
  MfeTitle,
  LoadingNotification,
  FilterContainer,
  FilterInput,
  FilterStatus,
  Button,
  ItemsList,
  ItemsListItem,
} from './components';

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
    <MfeContainer>
      <MfeTitle>🔍 Items Filter</MfeTitle>
      
      {/* External loading state (from other MFEs) */}
      {externalLoading && (
        <LoadingNotification>
          <span>⚡</span>
          {getLoadingMessage(loadingOperation)}
        </LoadingNotification>
      )}
      
      <FilterContainer>
        <FilterInput
          type="text"
          value={filter}
          onChange={handleFilterChange}
          placeholder="Type to filter items..."
        />
        
        <Button 
          variant="secondary"
          onClick={clearFilter}
          disabled={externalLoading}
        >
          🔄 Reset
        </Button>
        
        <Button
          variant="success"
          onClick={applyFilter}
          disabled={externalLoading || !filter.trim()}
        >
          🔍 Apply Filter
        </Button>
        
        <FilterStatus>
          Current: {currentFilter || 'None'} • Total: {filteredItems?.length || 0} items
        </FilterStatus>
      </FilterContainer>
      
      <ItemsList>
        {filteredItems?.map((item: any) => (
          <ItemsListItem key={item.id}>
            {item.name || JSON.stringify(item)}
          </ItemsListItem>
        ))}
      </ItemsList>
    </MfeContainer>
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
