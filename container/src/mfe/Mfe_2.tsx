import React, { useEffect, useRef } from 'react';

type Mfe2Props = {
  items: any[];
  onFilter?: (query: string) => Promise<any[]>;
  onLoad?: Function;
};

const Mfe_2: React.FC<Mfe2Props> = ({ items, onFilter, onLoad }) => {
  const mfe2Ref = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    import('mfe_2/mount').then(({ mount }) => {

      if (isMounted && mfe2Ref.current) {
        if (!instanceRef.current) {
          instanceRef.current = mount({ el: mfe2Ref.current, items, onFilter, onLoad });
          if (onLoad && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            onLoad();
          }

        }
      }

    }).catch((error) => {
      console.error('Error loading MFE 2:', error);
    });
   
    // Return cleanup function  

    return () => {
      isMounted = false;
      if (instanceRef.current && instanceRef.current.unmount) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [items]);

  return <div ref={mfe2Ref} />;
};

export default Mfe_2;