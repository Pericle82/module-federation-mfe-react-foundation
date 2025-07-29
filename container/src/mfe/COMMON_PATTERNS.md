# Microfrontend Common Patterns

This document outlines the common code structures that have been extracted from the individual MFE components (`Mfe_1`, `Mfe_2`, `Store_Mfe`) to reduce duplication and improve maintainability.

## Identified Common Patterns

### 1. **Mounting/Unmounting Logic**
All MFE components shared similar patterns for:
- Dynamic importing of mount functions
- DOM element reference management
- Instance lifecycle management
- Error handling during mount
- Cleanup during unmount

### 2. **React Hooks Pattern**
Consistent use of:
- `useRef` for DOM element references
- `useRef` for MFE instance references  
- `useRef` for tracking load state
- `useEffect` for mounting/unmounting
- `useEffect` for prop updates (in some cases)

### 3. **Props and Callbacks**
Common patterns for:
- `onLoad` callback execution
- Conditional mounting based on `isReady` state
- Props passing to mount functions

## Webpack Warning Resolution

### Problem
Dynamic imports with variable module names caused webpack warnings:
```
WARNING in ./src/mfe/hooks/useMicrofrontend.ts
Critical dependency: the request of a dependency is an expression
```

### Solution
Created an explicit module loader (`moduleLoader.ts`) that:

1. **Defines Static Import Mapping**: Maps module names to explicit import functions
2. **Provides Type Safety**: Uses TypeScript to ensure only valid module names are used  
3. **Helps Webpack Analysis**: Static imports allow webpack to understand the module structure

```typescript
// moduleLoader.ts
const moduleLoaders = {
  'mfe_1/mount': () => import(/* webpackChunkName: "mfe_1" */ 'mfe_1/mount'),
  'mfe_2/mount': () => import(/* webpackChunkName: "mfe_2" */ 'mfe_2/mount'),
  'service_mfe/mount': () => import(/* webpackChunkName: "service_mfe" */ 'service_mfe/mount'),
} as const;
```

### Benefits
- ✅ Eliminates webpack warnings
- ✅ Provides better chunk naming for debugging
- ✅ Type-safe module name validation
- ✅ Better webpack bundle analysis

## Extracted Common Utilities

### `useMicrofrontend` Hook

A custom hook that encapsulates all the common microfrontend mounting logic:

```typescript
const { elementRef, instance, isLoaded } = useMicrofrontend({
  moduleName: 'mfe_1/mount',
  mountProps: { items, onAddItem, onRemoveItem },
  onLoad: () => console.log('MFE loaded'),
  isReady: true,
  dependencies: [items],
  updatePropsOnChange: false
});
```

**Features:**
- Automatic mounting/unmounting
- Error handling
- Conditional mounting with `isReady`
- Props updates via `updatePropsOnChange`
- Customizable dependencies for re-mounting

### `createMicrofrontendComponent` HOC

A higher-order component that creates standardized MFE wrapper components:

```typescript
const MyMFE = createMicrofrontendComponent('my_mfe/mount', {
  updatePropsOnChange: true
});

// Usage
<MyMFE items={items} onFilter={handleFilter} />
```

### `GenericMicrofrontend` Component

A generic component that can be configured for any MFE:

```typescript
<GenericMicrofrontend
  moduleName="mfe_1/mount"
  mountProps={{ items, onAddItem, onRemoveItem }}
  onLoad={() => console.log('Loaded')}
  isReady={serviceReady}
/>
```

## Refactored Components

### Before vs After Comparison

**Before (Mfe_1.tsx):** ~50 lines with duplicated logic
**After (Mfe_1.tsx):** ~20 lines using common hook

The refactored components are:
- **More maintainable**: Common logic is centralized
- **More consistent**: All MFEs follow the same patterns
- **More testable**: Hook can be tested independently
- **More reusable**: New MFEs can use the same patterns

## Usage Guidelines

### For Simple MFEs
Use the `useMicrofrontend` hook directly:

```typescript
const MyMFE = ({ items, onLoad }) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'my_mfe/mount',
    mountProps: { items },
    onLoad
  });
  return <div ref={elementRef} />;
};
```

### For MFEs with Complex Props Updates
Enable prop updates:

```typescript
const { elementRef } = useMicrofrontend({
  moduleName: 'my_mfe/mount',
  mountProps: { items, filters },
  dependencies: [items, filters],
  updatePropsOnChange: true
});
```

### For MFEs with Conditional Mounting
Use the `isReady` flag:

```typescript
const { elementRef } = useMicrofrontend({
  moduleName: 'my_mfe/mount',
  isReady: serviceIsReady,
  mountProps: { items }
});
```

## Benefits

1. **Reduced Code Duplication**: ~70% reduction in boilerplate code per MFE
2. **Consistent Error Handling**: Centralized error handling for all MFEs
3. **Easier Testing**: Common logic can be unit tested once
4. **Better Type Safety**: TypeScript interfaces for all common patterns
5. **Easier Maintenance**: Changes to mounting logic only need to happen in one place
6. **Standardized Patterns**: New team members can follow established patterns

## Migration Guide

To migrate existing MFE components:

1. Import the `useMicrofrontend` hook
2. Replace manual mounting logic with the hook
3. Configure the hook options based on your component's needs
4. Remove the old `useEffect`, `useRef`, and manual mount/unmount logic
5. Test thoroughly to ensure the same behavior

## Future Enhancements

Potential improvements to consider:
- Lazy loading strategies
- Error boundaries integration
- Performance monitoring hooks
- Hot reloading support during development
- Automatic retry mechanisms for failed mounts
