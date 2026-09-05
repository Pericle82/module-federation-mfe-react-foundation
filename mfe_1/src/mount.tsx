/**
 * mfe_1 - the one and only public module of this remote
 * (COMPREHENSIVE_GUIDE.md § 4.1).
 *
 * `exposes: { './mount': './src/mount.tsx' }` in webpack.config.js makes this
 * file - and nothing else here - reachable from the host as `mfe_1/mount`.
 * useItems.ts, components.ts and theme.ts stay private to the remote.
 *
 * The contract is one function: `mount({ el, serviceApi })` renders this app
 * into the host's <div> on its own React root, and returns `{ unmount }`.
 */

import React from 'react';
import { useItems } from './useItems';
import { mountUtils } from './useMount';
import { 
  MfeContainer, 
  MfeTitle, 
  StatusMessage, 
  ItemsList, 
  ItemsListItem, 
  InputContainer, 
  Input, 
  Button, 
  RemoveButton 
} from './components';

type MF1props = {
  serviceApi?: any; // Service API with loaders, errors, and methods
};

// Presentation only: every piece of state and behaviour comes from useItems,
// which is where the bus wiring lives.
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
    notificationStats,
  } = useItems({ serviceApi });

  return (
    <MfeContainer>
      <MfeTitle>
        📦 Items Manager
        {/* Data owned by another MFE, received over the 'notifications'
            channel (§ 5.8) - never fetched directly from here. */}
        {notificationStats && (
          <span style={{ fontSize: '12px', marginLeft: '10px', color: '#6c757d' }}>
            👥 Users: {notificationStats.stats?.totalUsers || 0}
          </span>
        )}
      </MfeTitle>
      
      {/* KNOWN ISSUE (§ 10.1): `loaders`/`errors` are non-reactive snapshots of
          service_mfe's internal state, so none of these banners ever renders.
          The working pattern is mfe_2's `onLoadingChange` subscription. */}
      {/* Loading states */}
      {loaders.fetchItems && <StatusMessage variant="loading">🔄 Loading items...</StatusMessage>}
      {loaders.addItem && <StatusMessage variant="loading">➕ Adding item...</StatusMessage>}
      {loaders.removeItem && <StatusMessage variant="loading">🗑️ Removing item...</StatusMessage>}
      
      {/* Error states */}
      {errors.fetchItems && <StatusMessage variant="error">❌ Error loading items: {errors.fetchItems}</StatusMessage>}
      {errors.addItem && <StatusMessage variant="error">❌ Error adding item: {errors.addItem}</StatusMessage>}
      {errors.removeItem && <StatusMessage variant="error">❌ Error removing item: {errors.removeItem}</StatusMessage>}
      
      <ItemsList>
        {items?.map((item: any) => (
          <ItemsListItem key={item.id}>
            <span>{item.name || JSON.stringify(item)}</span>
            <RemoveButton 
              onClick={() => handleRemove(item.id)}
              disabled={loaders.removeItem}
            >
              🗑️ Remove
            </RemoveButton>
          </ItemsListItem>
        ))}
      </ItemsList>
      
      <InputContainer>
        <Input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Enter new item name..."
        />
        <Button 
          onClick={handleAdd} 
          disabled={loaders.addItem || !newItem.trim()}
        >
          ➕ Add Item
        </Button>
      </InputContainer>
    </MfeContainer>
  );
};

// Mount interface
interface mf1MountProps {
  el: HTMLElement;
  serviceApi?: any;
}

// Export mount and unmount functions using the utility
export function mount({el, serviceApi}: mf1MountProps): { unmount: () => void } {
  // No updateProps here: the host remounts this remote when serviceApi changes.
  return mountUtils.render(el, <Mfe1App serviceApi={serviceApi} />);
}

export function unmount(el: HTMLElement) {
  mountUtils.unmount(el);
}