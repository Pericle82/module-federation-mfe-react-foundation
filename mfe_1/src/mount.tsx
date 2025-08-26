
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
    <MfeContainer>
      <MfeTitle>📦 Items Manager</MfeTitle>
      
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
  return mountUtils.render(el, <Mfe1App serviceApi={serviceApi} />);
}

export function unmount(el: HTMLElement) {
  mountUtils.unmount(el);
}