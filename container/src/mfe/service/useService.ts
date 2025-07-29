import { useRef, useEffect, useState } from 'react';

export type ServiceApi = {
  unmount: () => void;
  fetchItems: () => Promise<any[]>;
  addItem: (item: any) => Promise<any[]>;
  removeItem: (id: string) => Promise<any[]>;
  filterItems: (query: string) => Promise<any[]>;
};

export function useServiceMfe(serviceRef: React.RefObject<HTMLDivElement>): ServiceApi | null {
  const instanceRef = useRef<ServiceApi | null>(null);
  const [serviceApi, setServiceApi] = useState<ServiceApi | null>(null);

  useEffect(() => {
    if (!serviceRef.current) {
      return;
    }
    let isMounted = true;
    import('service_mfe/mount').then(({ mount }) => {
      if (isMounted && serviceRef.current) {
        console.log('Mounting service MFE...');
        instanceRef.current = mount(serviceRef.current);
        console.log('Service MFE mounted:', instanceRef.current);
        setServiceApi(instanceRef.current); // Trigger re-render
      }
    }).catch((error) => {
      console.error('Failed to load service_mfe:', error);
      setServiceApi(null);
    });
    
    return () => {
      isMounted = false;
      if (instanceRef.current && instanceRef.current.unmount) {
        console.log('Unmounting service MFE...');
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
      setServiceApi(null);
    };
  }, [serviceRef]);

  return serviceApi;
}
