import React from 'react';
import { useMicrofrontend } from './hooks';

export type Mfe1Props = {
  items: any[];
  onLoad?: Function; // Optional prop to trigger initial load
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string ) => Promise<void>;
  isReady: boolean; // NEW: add isReady prop
};

const Mfe_1: React.FC<Mfe1Props> = ({ items, onLoad, addItem, removeItem, isReady }) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'mfe_1/mount',
    mountProps: {
      items,
      onAddItem: addItem,
      onRemoveItem: removeItem,
    },
    onLoad: onLoad as (() => void) | undefined,
    isReady,
    dependencies: [items],
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  return <div ref={elementRef as React.RefObject<HTMLDivElement>} />;
};

export default Mfe_1;
