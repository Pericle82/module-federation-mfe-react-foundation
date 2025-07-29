# ServiceContext Usage Guide

This document explains how to use the ServiceContext to robustly integrate micro-frontends (MFEs) with the service_mfe API and how the container orchestrates communication between MFEs.

## Overview

The ServiceContext provides a centralized way to:
- Mount and manage the service_mfe (backend API wrapper)
- Expose service API functions to all MFEs
- Share service state across the container and MFEs
- Handle loading states and errors
- Provide type-safe access to service functions
- Enable communication between MFEs without tight coupling

## Architecture & Data Flow

```
Container App (Root)
├── ServiceProvider (Context Provider)
│   ├── Hidden service_mfe mount point (connects to mock_json_server)
│   ├── Auto-fetch and state management  
│   ├── Error handling & loading states
│   └── Centralized API wrapper
├── Container Bootstrap
│   ├── Coordinates MFE mounting
│   ├── Passes shared state as props
│   ├── Handles MFE lifecycle events
│   └── Provides fallback UI
└── MFE Components
    ├── Mfe_1 (Add/Remove items + receives shared state)
    ├── Mfe_2 (Filter items + receives filter function)
    └── Store_Mfe (Redux store + can access context)
```

### Data Flow Sequence:
1. **Container starts** → ServiceProvider mounts service_mfe
2. **service_mfe** connects to mock_json_server (port 4000)
3. **ServiceContext** exposes API functions (fetchItems, addItem, etc.)
4. **Container** gets state from context (items, isReady, etc.)
5. **Container** passes state + functions to MFEs as props
6. **MFEs** perform actions → trigger API calls → update shared state
7. **All MFEs** automatically receive updated state via props

## How Container & MFEs Work Together

### Container Responsibilities:
- **Orchestration**: Manages MFE mounting and lifecycle
- **State Distribution**: Shares service state across all MFEs
- **API Coordination**: Provides consistent API access
- **Error Handling**: Catches and displays errors from MFEs
- **Loading Management**: Shows loading states during API operations

### MFE Responsibilities:
- **UI Rendering**: Display their specific functionality
- **Local State**: Manage their own component-specific state
- **API Calls**: Trigger actions via provided callback functions
- **Event Handling**: Respond to user interactions
- **Dynamic Updates**: Handle prop changes gracefully

### Communication Patterns:

#### 1. **Container → MFE (Props)**
```tsx
// Container passes data down
<Mfe_1 
  items={items}              // Shared state
  addItem={addItem}          // Shared function
  isReady={isReady}          // Service status
  onLoad={() => fetchItems()} // Lifecycle callback
/>
```

#### 2. **MFE → Container (Callbacks)**
```tsx
// MFE triggers container functions
const handleAddItem = async (newItem) => {
  await props.addItem(newItem); // Calls container's addItem
  // Container automatically updates all MFEs with new state
};
```

#### 3. **MFE ↔ MFE (via Container State)**
```tsx
// Mfe_1 adds item → triggers container state update → Mfe_2 gets new items
Mfe_1: addItem("New Item") → ServiceContext updates items[]
Container: Re-renders with new items → Passes to all MFEs
Mfe_2: Receives updated items[] → Re-renders with new data
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
import { useServiceContext, useServiceFunctions, useServiceState } from './ServiceContext';

const MyComponent = () => {
  // Get all context data (renamed from useService)
  const { items, isReady, isLoading, error, fetchItems } = useServiceContext();

  // Get only state
  const { items, isReady, isLoading, error } = useServiceState();

  // Get only functions  
  const { fetchItems, addItem, removeItem, filterItems } = useServiceFunctions();
  
  // Note: useServiceApi() is not exposed - use useServiceContext() instead
};
```

## Available Hooks (Updated)

### `useServiceContext()` ⭐ (Main Hook)
Returns the complete service context:
- `serviceApi`: Raw service API object (internal use)
- `isReady`: Boolean indicating if service is mounted and ready
- `isLoading`: Boolean indicating if a request is in progress  
- `error`: String error message or null
- `items`: Array of current items from the backend
- `setItems`: Function to manually update items (rarely needed)
- `fetchItems`: Wrapped fetch function with error handling
- `addItem`: Wrapped add function with error handling
- `removeItem`: Wrapped remove function with error handling
- `filterItems`: Wrapped filter function with error handling

### `useServiceState()` 📊 (State Only)
Returns only state values for read-only access:
- `items`: Current items array
- `isReady`: Service readiness status
- `isLoading`: Loading state
- `error`: Error message if any

### `useServiceFunctions()` 🔧 (Functions Only)  
Returns only service functions for actions:
- `fetchItems`: Load all items from backend
- `addItem`: Add new item to backend
- `removeItem`: Remove item from backend  
- `filterItems`: Filter items by query string

## Backend Integration

The service system connects multiple layers:

```
MFE Components → ServiceContext → service_mfe → mock_json_server
     ↑                ↑              ↑              ↑
   UI Layer     Context Layer   API Layer      Backend
```

### Service Lifecycle:
1. **ServiceProvider** mounts hidden service_mfe component
2. **service_mfe** connects to mock_json_server (localhost:4000)
3. **API becomes ready** → `isReady: true`
4. **MFEs can safely call** API functions
5. **All changes** automatically sync across MFEs

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

## Troubleshooting

### Common Issues and Solutions

#### 1. "null is not an object (evaluating 'apiRef.current.fetchItems')"
**Problem**: MFE trying to use service API before it's ready
**Solution**: Always check `isReady` before using service functions
```tsx
const { isReady, fetchItems } = useServiceContext();

// ✅ Good
if (isReady) {
  await fetchItems();
}

// ❌ Bad
await fetchItems(); // May fail if service not ready
```

#### 2. Service functions not working in MFEs
**Problem**: MFE component trying to use service before mount complete
**Solution**: Use conditional rendering and proper effect dependencies
```tsx
const Mfe_2 = ({ items, onLoad }: MfeProps) => {
  const { isReady } = useServiceContext();
  const mfeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReady && mfeRef.current) {
      // Only mount MFE when service is ready
      import('mfe_2/mount').then(({ mount }) => {
        mount(mfeRef.current, isReady ? items : [], filterItems);
        onLoad?.();
      });
    }
  }, [items, isReady]); // Include isReady in dependencies

  return <div ref={mfeRef} />;
};
```

#### 3. useService vs useServiceContext naming conflicts
**Problem**: Multiple functions named `useService` in different files
**Solution**: Use the renamed hooks from ServiceContext
```tsx
// ✅ Use the renamed hooks
import { useServiceContext, useServiceState, useServiceFunctions } from './ServiceContext';

// ❌ Avoid conflicts with service_mfe useService
// import { useService } from '../service_mfe/useApi'; // Don't mix these
```

#### 4. Mock server not responding (ECONNREFUSED)
**Problem**: mock_json_server not running or on wrong port
**Solution**: Ensure mock server is running on correct port
```bash
# Check if server is running
curl http://localhost:4000/items

# If not running, start it:
cd mock_json_server
npm start
```

#### 5. npm install hanging during startup
**Problem**: Cached dependencies or lock file conflicts
**Solution**: Use the cache cleaning startup script
```bash
# Use the enhanced startup script
./start_all_mfe.sh

# Or manually clean:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 6. MFE not updating when items change
**Problem**: MFE not re-rendering when service state updates
**Solution**: Ensure proper prop passing and effect dependencies
```tsx
// In container - pass items as props
<Mfe_1 items={items} show={activeTab === 'mfe1'} />

// In MFE - watch for items changes
useEffect(() => {
  if (isReady && items) {
    // Re-mount or update MFE with new items
    mount(mfeRef.current, items, filterItems);
  }
}, [items, isReady]); // Items dependency triggers updates
```

### Debug Tips

1. **Check Service Readiness**: Always log `isReady` state first
2. **Verify Mock Server**: Test API endpoints directly with curl/browser
3. **Monitor Console**: Watch for federation loading errors
4. **Check Network Tab**: Verify MFE remote entries are loading
5. **Use React DevTools**: Inspect ServiceContext state changes

### Performance Considerations

1. **Avoid unnecessary re-renders**: Use `useServiceState()` for read-only access
2. **Minimize effect dependencies**: Only include essential dependencies in useEffect
3. **Debounce API calls**: For search/filter operations, add debouncing
4. **Cache management**: Clear npm cache if having dependency issues

### Testing Considerations

1. **Mock ServiceContext**: Create test provider for unit tests
2. **Test service readiness**: Verify components handle `isReady: false` state
3. **Error state testing**: Test error boundaries and error handling
4. **Integration testing**: Test full flow from container to mock server
