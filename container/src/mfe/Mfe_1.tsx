import React, { useEffect, useRef } from 'react';

export type Mfe1Props = {
  items: any[];
  onLoad?: Function; // Optional prop to trigger initial load
  addItem: (item: any) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  isReady: boolean; // NEW: add isReady prop
};

const Mfe_1: React.FC<Mfe1Props> = ({ items, onLoad, addItem, removeItem, isReady }) => {
  const mfe1Ref = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isReady) return; // Only mount when service is ready
    let isMounted = true;
    import('mfe_1/mount').then(( {mount} ) => {
      if (isMounted && mfe1Ref.current) {
        // Mount handles root creation/reuse automatically with WeakMap pattern
        instanceRef.current = mount({
          el: mfe1Ref.current,
          items,
          onAddItem: addItem,
          onRemoveItem: removeItem,
        });
        // Trigger onLoad if provided and this is first mount
        if (onLoad && !hasLoadedRef.current) {
          hasLoadedRef.current = true;
          onLoad();
        }
      }
    }).catch((error) => {
      console.error('Error loading MFE 1:', error);
    });
    
    // Return cleanup function
    return () => {
      isMounted = false;
      if (instanceRef.current?.unmount) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [items, isReady]);

  return <div ref={mfe1Ref} />;
};

export default Mfe_1;
