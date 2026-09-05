/**
 * mfe_2 - public module of the "items filter" remote
 * (COMPREHENSIVE_GUIDE.md § 4.1).
 *
 * Two things make this remote the interesting one:
 *   - it is a pure reader of the shared items dataset (no writes at all), yet
 *     it stays in sync with writes performed elsewhere;
 *   - it is the only remote that shows *someone else's* work in progress, by
 *     subscribing to the loading channel of the bus (§ 5.7).
 *
 * It is also the only mount() that returns `updateProps`, so the host can hand
 * it new props without a remount.
 */

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
    notificationStats,
  } = useItemsFilter({ serviceApi });

  // Turns the `operation` label travelling on the loading channel into a
  // human sentence. 'dataSync' is the inner phase of any write: the re-read
  // service_mfe performs before broadcasting (§ 6.2).
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
      <MfeTitle>
        🔍 Items Filter
        {notificationStats && (
          <span style={{ fontSize: '12px', marginLeft: '10px', color: '#6c757d' }}>
            👥 Users: {notificationStats.stats?.totalUsers || 0}
          </span>
        )}
      </MfeTitle>
      
      {/* This is a write started in mfe_1 or users_mfe, not here. Buttons
          below are disabled while it runs to avoid filtering over data that
          is about to be replaced. */}
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
      
      {/* Renders `filteredItems`, never `items`: the full list is kept only as
          the base for re-filtering (see useItemsFilter). */}
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
    // `render` on an existing root is a plain re-render, so React reconciles
    // and the component keeps its state - which is the whole point of
    // preferring this over a remount (the filter survives).
    updateProps: (newProps: { serviceApi?: any }) => {
      mountUtils.render(el, <Mf2App {...newProps} />);
    },
    unmount: mountResult.unmount
  };
}
