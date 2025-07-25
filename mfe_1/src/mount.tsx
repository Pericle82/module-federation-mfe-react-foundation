
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

type MF1props = {
  items?: any[] | [];
  onAddItem?: (item: any) => Promise<any[]>;
  onRemoveItem?: (id: string | number) => Promise<any[]>;
};

const Mfe1App: React.FC<MF1props> = (props) => {

  const { items, onAddItem, onRemoveItem } = props;

  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items && items.length > 0) {
      console.log('MFE 1 received items:', items);
    } else {
      console.warn('MFE 1 received empty or undefined items');
    }
  }, [items]);

  const handleAdd = useCallback(async () => {
  
    if (!newItem.trim()) return;
    setLoading(true);
    try {
      if (onAddItem) {
        await onAddItem(newItem);
      }
      else {
        console.warn('onAddItem function is not provided');
      }
      setNewItem("");
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setLoading(false);
    }
  }, [newItem, onAddItem]);

  const handleRemove = useCallback(async (id: string | number) => {
    setLoading(true);
    try {
      if (onRemoveItem) {
        await onRemoveItem(id);
      }
      else {
        console.warn('onRemoveItem function is not provided');
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setLoading(false);
    }

  }, [onRemoveItem]);

  return (
    <div style={{ border: '2px solid #764ba2', borderRadius: 8, padding: 16, margin: 16 }}>
      <h2>mfe_1 Micro-Frontend</h2>
      {loading && <p>Loading...</p>}
      <ul>
        {items?.map((item: any) => (
          <li key={item.id}>
            {item.name || JSON.stringify(item)}
            <button style={{ marginLeft: 8 }} onClick={() => handleRemove(item.id)}>Elimina</button>
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={newItem}
        onChange={e => setNewItem(e.target.value)}
        placeholder="Nuovo oggetto"
      />
      <button onClick={handleAdd} disabled={loading || !newItem.trim()}>Aggiungi</button>
    </div>
  );
};


// At module scope
const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

interface mf1MountProps {
  el: HTMLElement;
  items?: any[];
  onAddItem?: (item: any) => Promise<any[]>;
  onRemoveItem?: (id: string | number) => Promise<any[]>;
}

export function unmount(el: HTMLElement) {
  const root = roots.get(el);
  if (root) {
    root.unmount();
    roots.delete(el);
  }
}

export function mount({el, items = [], onAddItem, onRemoveItem}: mf1MountProps): {
  unmount: () => void;
} {

  let root = roots.get(el);
  if (!root) {
    root = ReactDOM.createRoot(el);
    roots.set(el, root);
  }
  root.render(<Mfe1App
                        onRemoveItem={onRemoveItem}
                        onAddItem={onAddItem}
                        items={items} />
              );
  return {
    unmount: () => {
      root?.unmount();
      roots.delete(el);
    }
  };
}