# ServiceContext Usage Guide

This document explains how to use the ServiceContext to robustly integrate micro-frontends (MFEs) with the service_mfe API.

## Overview

The ServiceContext provides a centralized way to:
- Mount and manage the service_mfe
- Expose service API functions to all MFEs
- Share service state across the container and MFEs
- Handle loading states and errors
- Provide type-safe access to service functions

## Architecture

```
Container App (Root)
├── ServiceProvider (Context Provider)
│   ├── Hidden service_mfe mount point
│   ├── Auto-fetch and state management  
│   └── Error handling
├── MFE Components
│   ├── Mfe_1 (receives items as props)
│   ├── Mfe_2 (receives items and filter function)
│   └── Store_Mfe (can access context internally)
└── Context Consumers (examples)
```

## Setup

### 1. Wrap your app with ServiceProvider

```tsx
import { ServiceProvider } from './ServiceContext';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <ErrorBoundary>
    <ServiceProvider>
      <App />
    </ServiceProvider>
  </ErrorBoundary>
);
```

### 2. Use hooks in your components

```tsx
import { useService, useServiceFunctions, useServiceState } from './ServiceContext';

const MyComponent = () => {
  // Get all context data
  const { items, isReady, isLoading, error, fetchItems } = useService();

  // Get only state
  const { items, isReady, isLoading, error } = useServiceState();

  // Get only functions
  const { fetchItems, addItem, removeItem, filterItems } = useServiceFunctions();
  
  // Use raw API
  const serviceApi = useServiceApi();
};
```

## Available Hooks

### `useService()`
Returns the complete service context:
- `serviceApi`: Raw service API object
- `isReady`: Boolean indicating if service is mounted and ready
- `isLoading`: Boolean indicating if a request is in progress
- `error`: String error message or null
- `items`: Array of current items
- `setItems`: Function to update items
- `fetchItems`: Wrapped fetch function with error handling
- `addItem`: Wrapped add function with error handling
- `removeItem`: Wrapped remove function with error handling
- `filterItems`: Wrapped filter function with error handling

### `useServiceState()`
Returns only state values:
- `items`, `isReady`, `isLoading`, `error`

### `useServiceFunctions()`
Returns only service functions:
- `fetchItems`, `addItem`, `removeItem`, `filterItems`

### `useServiceApi()`
Returns the raw service API object for advanced usage.

## Usage Patterns

### Pattern 1: Props-based (Current MFEs)

```tsx
// In container
const App = () => {
  const { items } = useService();
  const { filterItems } = useServiceFunctions();

  return (
    <div>
      <Mfe_1 items={items} />
      <Mfe_2 items={items} onFilter={filterItems} />
    </div>
  );
};
```

### Pattern 2: Context-based (Within MFEs)

```tsx
// Inside an MFE component
const MfeInternalComponent = () => {
  const { items, isLoading, error } = useServiceState();
  const { fetchItems, addItem } = useServiceFunctions();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={fetchItems}>Refresh</button>
      <button onClick={() => addItem({ name: 'New Item' })}>Add Item</button>
      <ul>
        {items.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  );
};
```

### Pattern 3: Mixed approach

```tsx
// Pass essential data as props, use context for functions
const Mfe_2 = ({ items, onLoad }) => {
  const { filterItems, isReady } = useService();
  const mfeRef = useRef(null);

  useEffect(() => {
    if (isReady) {
      import('mfe_2/mount').then(({ mount }) => {
        mount(mfeRef.current, items, filterItems);
        onLoad?.();
      });
    }
  }, [items, isReady]);

  return <div ref={mfeRef} />;
};
```

## Benefits

1. **Centralized State Management**: Single source of truth for service data
2. **Automatic Error Handling**: Built-in error handling and loading states
3. **Type Safety**: Full TypeScript support with proper types
4. **Flexible API**: Multiple hooks for different use cases
5. **Performance**: Optimized with useCallback and proper dependencies
6. **Easy Testing**: Context can be easily mocked for unit tests

## Migration from Direct Hook Usage

If you're currently using `useServiceMfe` directly:

```tsx
// Before
const serviceRef = useRef(null);
const serviceApi = useServiceMfe(serviceRef);
const [items, setItems] = useState([]);

// After
const { items, fetchItems, isReady } = useService();
// No need for manual state management or refs
```

## Error Handling

The context automatically handles errors and provides them through the `error` property:

```tsx
const MyComponent = () => {
  const { error, isLoading } = useServiceState();
  const { fetchItems } = useServiceFunctions();

  const handleRetry = async () => {
    try {
      await fetchItems();
    } catch (err) {
      // Error is automatically captured in context
      console.log('Error occurred, check context error:', error);
    }
  };

  return (
    <div>
      {error && <div style={{color: 'red'}}>Error: {error}</div>}
      {isLoading && <div>Loading...</div>}
      <button onClick={handleRetry}>Retry</button>
    </div>
  );
};
```

## Best Practices

1. Use `useServiceState()` when you only need state values
2. Use `useServiceFunctions()` when you only need functions
3. Use `useService()` when you need both state and functions
4. Always check `isReady` before calling service functions
5. Handle loading and error states in your UI
6. Use context at the component level where service data is needed
7. Prefer context over prop drilling for service API access
