import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

type Mf2AppProps = {
  items?: any[];
  onMount?: () => void;
  onFilter?: (query: string) => Promise<any[]>;
};

const Mf2App: React.FC<Mf2AppProps> = (props) => {

  const [filter, setFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("");
  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  const { items = [], onFilter, onMount } = props;

  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, [onMount]);

  useEffect(() => {
    if (onFilter && filter.trim()) {
      onFilter(filter);
    }
  }, [filter, onFilter]);

  useEffect(() => {
    if (items.length > 0) {
      setFilteredItems(items);
    }
  }, [items]);


  const handleFilter = useCallback(async () => {
    if (!filter.trim()) {
      setCurrentFilter("");
      return;
    }
    setLoading(true);
    try {
      let filteredItems;
      if (onFilter) {
        // Use the provided onFilter callback if available
        filteredItems = await onFilter(filter);
      } else {
        // Fallback to default filtering logic
        filteredItems = items.filter(item => {
          return item.name?.toLowerCase().includes(filter.toLowerCase());
        });
      }
      setFilteredItems(filteredItems);
      setCurrentFilter(filter);
    } catch (error) {
      console.error('Error filtering items:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, onFilter, items]);

  const handleFilterReset = useCallback(() => {
    setFilter("");
    setCurrentFilter("");
    setFilteredItems(items);
  }, []);

  return (
    <div style={{ border: '2px solid #007bff', padding: 16, borderRadius: 8, margin: 8 }}>
      <h2>MF 2 - Filtro Items</h2>
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filtra items..."
        style={{ marginRight: 8 }}
      />

      <button onClick={() => handleFilterReset()} disabled={loading}>Resetta Filtro</button>
      <span style={{ marginLeft: 8 }}>Filtro attuale: {currentFilter || 'Nessuno'}</span>
      <br />
      <button
        onClick={handleFilter}
        disabled={loading || !filter.trim()}
      >Filtra</button>
      {loading && <p>Loading...</p>}
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
  items?: any[];
  onFilter?: (query: string) => Promise<any[]>;
  onMount?: () => void;
}

export function mount({el, items = [], onFilter, onMount}: mf2MountProps): { unmount: () => void; updateProps: (props: { items?: any[]; onFilter?: (query: string) => Promise<any[]> }) => void } {
  let root = roots.get(el);
  if (!root) {
    root = ReactDOM.createRoot(el);
    roots.set(el, root);
  }
  
  let currentProps = { items, onFilter, onMount };
  
  const render = () => {
    root!.render(<Mf2App {...currentProps} />);
  };
  
  render(); // Initial render

  return {
    updateProps: (newProps: { items?: any[]; onFilter?: (query: string) => Promise<any[]> }) => {
      currentProps = { ...currentProps, ...newProps };
      render();
    },
    unmount: () => {
      root?.unmount();
      roots.delete(el);
    }
  };
}
