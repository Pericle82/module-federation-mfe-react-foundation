# Microfrontend No Events - Comprehensive Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [Implementation Details](#implementation-details)
4. [Loading State Notification System](#loading-state-notification-system)
5. [Development Guides](#development-guides)
6. [Performance Optimizations](#performance-optimizations)
7. [Debugging & Source Maps](#debugging--source-maps)
8. [API Reference](#api-reference)

---

## Project Overview

This project demonstrates a sophisticated **microfrontend architecture** built with React 18, TypeScript, and Webpack 5 Module Federation. The system evolved from a React Context-based approach to an **event-driven architecture** with **custom hooks** and **cross-MFE loading state notifications**.

### Key Features
- ✅ **Event-driven data synchronization** between microfrontends
- ✅ **Multi-entity support** (Items + Users)
- ✅ **Real-time loading state notifications** across MFEs
- ✅ **Custom hooks architecture** for clean separation of concerns
- ✅ **Shared mount utilities** for consistent React rendering
- ✅ **Type-safe event system** with TypeScript
- ✅ **Optimistic updates** for better user experience

### Services Architecture
```
Port 3001: Container (Main App)
Port 3002: MFE_1 (Items CRUD)
Port 3003: MFE_2 (Items Filtering with Loading Awareness)
Port 3004: Service_MFE (API Layer + Event System)
Port 3005: Users_MFE (Users CRUD)
Port 3006: Store_MFE (Redux State Management)
Port 4000: Mock JSON Server (API Backend)
```

---

## Architecture Summary


### Current Architecture Benefits

#### ✅ **Event-Driven Synchronization**
- MFEs communicate through typed events, not direct coupling
- Real-time data updates across all microfrontends
- Clean separation between data providers and consumers

#### ✅ **Loading State Awareness**
- MFE_2 shows loading indicators when MFE_1 performs operations
- Operation-specific notifications (addItem, removeItem, dataSync)
- Enhanced user experience with real-time feedback

#### ✅ **Custom Hooks Architecture**
- Business logic separated from presentation components
- Reusable hooks: `useItems`, `useItemsFilter`, `useUsers`
- Clean, testable, and maintainable code structure

#### ✅ **Shared Utilities**
- Centralized mount utilities (`mountUtils`) across all MFEs
- Consistent React rendering and cleanup patterns
- Reduced code duplication

---

## Implementation Details

### Service MFE API Interface

```typescript
export interface ServiceMfeApi {
  // Items operations
  fetchItems: () => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string) => Promise<any[]>;
  
  // Users operations
  fetchUsers: () => Promise<any[]>;
  filterUsers: (query: string) => Promise<any[]>;
  addUser: (user: any) => Promise<any[]>;
  removeUser: (id: string) => Promise<any[]>;
  
  // Event system
  onDataChange: <T = any>(dataType: 'items' | 'users', callback: (data: T[]) => void) => () => void;
  onLoadingChange: (dataType: 'items' | 'users', callback: (isLoading: boolean, operation?: string) => void) => () => void;
  
  // State accessors
  loaders: { [key: string]: boolean };
  errors: { [key: string]: string | null };
  unmount: () => void;
}
```

### Event System Architecture

#### Data Change Events
```typescript
// Global event listeners for data synchronization
const dataChangeListeners = {
  items: new Set<(data: any[]) => void>(),
  users: new Set<(data: any[]) => void>(),
};

// Notification function
const notifyDataChange = async <T = any>(
  dataType: 'items' | 'users',
  getLatestData: () => Promise<T[]>
) => {
  // Notify loading start for data sync
  notifyLoadingChange(dataType, true, 'dataSync');
  
  const latestData = await getLatestData();
  const listeners = dataChangeListeners[dataType];
  listeners.forEach(callback => callback(latestData));
  
  // Notify loading end for data sync
  notifyLoadingChange(dataType, false, 'dataSync');
};
```

#### Loading State Events
```typescript
// Global event listeners for loading states
const loadingChangeListeners = {
  items: new Set<(isLoading: boolean, operation?: string) => void>(),
  users: new Set<(isLoading: boolean, operation?: string) => void>(),
};

// Loading notification function
const notifyLoadingChange = (
  dataType: 'items' | 'users',
  isLoading: boolean,
  operation?: string
) => {
  const listeners = loadingChangeListeners[dataType];
  listeners.forEach(callback => callback(isLoading, operation));
};
```

---

## Loading State Notification System

### How It Works

1. **Operation Start**: When MFE_1 calls `addItem()` or `removeItem()`, loading notification is sent
2. **API Call**: Service MFE performs the actual API operation
3. **Operation End**: Loading notification signals operation completion
4. **Data Sync Start**: `notifyDataChange` begins fetching latest data
5. **Data Sync End**: All MFEs receive updated data and loading state clears

### MFE_2 Implementation

```typescript
// useItemsFilter.ts - Subscribe to loading changes
useEffect(() => {
  if (!serviceApi?.onLoadingChange) return;

  const unsubscribe = serviceApi.onLoadingChange('items', (isLoading: boolean, operation?: string) => {
    console.log(`MFE_2 received loading notification: ${operation} - ${isLoading ? 'STARTED' : 'FINISHED'}`);
    setExternalLoading(isLoading);
    setLoadingOperation(operation || "");
  });

  return unsubscribe; // Cleanup subscription on unmount
}, [serviceApi]);
```

### Loading Messages

```typescript
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
```

### UI Integration

```tsx
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
```

---

## Development Guides

### Custom Hooks Pattern

#### useItems Hook (MFE_1)
```typescript
export const useItems = ({ serviceApi }: UseItemsProps): UseItemsReturn => {
  const [items, setItems] = useState<any[]>([]);

  // Subscribe to data changes
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;
    
    const unsubscribe = serviceApi.onDataChange('items', (updatedItems: any[]) => {
      setItems(updatedItems);
    });
    
    return unsubscribe;
  }, [serviceApi]);

  // CRUD operations
  const handleAddItem = useCallback(async (itemName: string) => {
    if (!serviceApi?.addItem || !itemName.trim()) return;
    
    try {
      await serviceApi.addItem({ name: itemName.trim() });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  }, [serviceApi]);

  return { items, handleAddItem, handleRemoveItem };
};
```

#### useItemsFilter Hook (MFE_2)
```typescript
export const useItemsFilter = ({ serviceApi }: UseItemsFilterProps): UseItemsFilterReturn => {
  const [externalLoading, setExternalLoading] = useState(false);
  const [loadingOperation, setLoadingOperation] = useState<string>("");

  // Subscribe to loading state changes
  useEffect(() => {
    if (!serviceApi?.onLoadingChange) return;

    const unsubscribe = serviceApi.onLoadingChange('items', (isLoading: boolean, operation?: string) => {
      setExternalLoading(isLoading);
      setLoadingOperation(operation || "");
    });

    return unsubscribe;
  }, [serviceApi]);

  return { externalLoading, loadingOperation, /* other properties */ };
};
```

### Mount Utilities Pattern

```typescript
// useMount.ts - Shared utilities
export const mountUtils = {
  render: (element: HTMLElement, component: React.ReactElement) => {
    let root = roots.get(element);
    if (!root) {
      root = ReactDOM.createRoot(element);
      roots.set(element, root);
    }
    
    root.render(component);
    
    return {
      unmount: () => {
        root?.unmount();
        roots.delete(element);
      }
    };
  }
};

// mount.tsx - Usage in MFEs
export function mount({el, serviceApi}: MountProps) {
  const mountResult = mountUtils.render(el, <MyApp serviceApi={serviceApi} />);
  
  return {
    updateProps: (newProps) => {
      mountUtils.render(el, <MyApp {...newProps} />);
    },
    unmount: mountResult.unmount
  };
}
```

---

## Performance Optimizations

### Selective Delay Middleware

The mock server applies delays strategically:

```javascript
// delay.js - Smart delay application
module.exports = (req, res, next) => {
  const shouldDelay = (
    req.method === 'GET' && 
    req.path === '/items' && 
    !req.query.q // Don't delay filter operations
  );
  
  if (shouldDelay) {
    console.log('DELAY middleware - applying 2s delay for main fetch items');
    setTimeout(next, 2000);
  } else {
    console.log(`DELAY middleware - no delay for ${req.method} ${req.path}`);
    next();
  }
};
```

### Optimistic Updates

```typescript
const removeItem = useCallback(async (id: string): Promise<void> => {
  // Optimistically update local state first
  setItems(prevItems => prevItems.filter(item => item.id !== id));
  
  // Perform actual deletion (fast, no delay)
  await serviceApi.removeItem(id);
  
  // Data change notification handles sync
}, [serviceApi]);
```

---

## Debugging & Source Maps

### Webpack Configuration

All MFEs use proper source map configuration:

```javascript
module.exports = {
  devtool: 'eval-source-map', // Best for development
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: {
          loader: 'babel-loader',
          options: {
            sourceMaps: true,
            inputSourceMap: true,
          },
        },
      },
    ],
  },
};
```

### Benefits
- ✅ Click console links to open TypeScript source files
- ✅ Original variable names preserved in debugging
- ✅ Accurate line numbers matching source code
- ✅ Set breakpoints directly in TypeScript

### Browser DevTools Setup
1. **Settings** → **Preferences** → **Sources**
2. ✅ **Enable JavaScript source maps**
3. ✅ **Enable CSS source maps**

---

## API Reference

### Service MFE Functions

#### Items API
```typescript
fetchItems(): Promise<any[]>           // Get all items
filterItems(query: string): Promise<any[]>  // Filter items by query
addItem(item: any): Promise<any[]>     // Add new item
removeItem(id: string): Promise<any[]> // Remove item by ID
```

#### Users API
```typescript
fetchUsers(): Promise<any[]>           // Get all users
filterUsers(query: string): Promise<any[]>  // Filter users by query
addUser(user: any): Promise<any[]>     // Add new user
removeUser(id: string): Promise<any[]> // Remove user by ID
```

#### Event System
```typescript
onDataChange<T>(dataType: 'items' | 'users', callback: (data: T[]) => void): () => void
onLoadingChange(dataType: 'items' | 'users', callback: (isLoading: boolean, operation?: string) => void): () => void
```

### Custom Hooks

#### useItems (MFE_1)
```typescript
interface UseItemsReturn {
  items: any[];
  handleAddItem: (itemName: string) => Promise<void>;
  handleRemoveItem: (id: string) => Promise<void>;
}
```

#### useItemsFilter (MFE_2)
```typescript
interface UseItemsFilterReturn {
  items: any[];
  filteredItems: any[];
  filter: string;
  currentFilter: string;
  externalLoading: boolean;
  loadingOperation: string;
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilter: () => void;
  clearFilter: () => void;
}
```

#### useUsers (Users MFE)
```typescript
interface UseUsersReturn {
  users: any[];
  handleAddUser: (userName: string) => Promise<void>;
  handleRemoveUser: (id: string) => Promise<void>;
}
```

---

## Getting Started

### 1. Install Dependencies
```bash
# Install all dependencies for all MFEs
./start_all_mfe.sh
```

### 2. Development Workflow
```bash
# Start all services
./start_all_mfe.sh

# Check endpoints
./check_mfe_endpoints.sh

# Stop all services
./stop_all_mfe.sh
```

### 3. Testing the Loading States
1. Open http://localhost:3001
2. In MFE_1, add or remove an item
3. Observe MFE_2 showing loading indicators in real-time
4. Notice the operation-specific messages

---

## Summary

This microfrontend architecture successfully demonstrates:

- **🚀 Real-time cross-MFE communication** without tight coupling
- **⚡ Responsive loading states** that enhance user experience  
- **🏗️ Clean architecture** with custom hooks and shared utilities
- **🔧 Type-safe event system** for reliable inter-MFE communication
- **📊 Multi-entity support** with independent state management
- **🎯 Performance optimization** with selective delays and optimistic updates

The system provides a robust foundation for scalable microfrontend applications with excellent developer experience and user interface responsiveness.
