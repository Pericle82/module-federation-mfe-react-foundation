import React, { useEffect, useRef } from 'react';

type StoreMfeProps = {
  onLoad?: () => void;
};

const Store_Mfe: React.FC<StoreMfeProps> = ({ onLoad }) => {
  const storeMfeRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    import('store_mfe/mount').then(({ mount }) => {
      if (storeMfeRef.current && !instanceRef.current) {
        instanceRef.current = mount(storeMfeRef.current);
        if (onLoad) {
          onLoad();
        }
      }
    }).catch(console.error);

    return () => {
      if (instanceRef.current && instanceRef.current.unmount) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [onLoad]);

  return <div ref={storeMfeRef} />;
};

export default Store_Mfe;