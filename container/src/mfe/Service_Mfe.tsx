import React, { useRef, useImperativeHandle, forwardRef } from 'react';

export type ServiceMfeProps = {
    onLoad?: () => void;
    onApiReady?: (api: any) => void; // Callback when service API becomes available
};

export type ServiceMfeRef = {
    getApi: () => any | null;
    getLoaders: () => any;
    getErrors: () => any;
};

const Service_Mfe = forwardRef<ServiceMfeRef, ServiceMfeProps>(({ onLoad, onApiReady }, ref) => {
    const apiRef = useRef<any>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Stabilize callback references
    const onLoadRef = useRef(onLoad);
    const onApiReadyRef = useRef(onApiReady);

    // Update refs when props change
    React.useEffect(() => {
        onLoadRef.current = onLoad;
        onApiReadyRef.current = onApiReady;
    }, [onLoad, onApiReady]);

    const loadServiceMfe = async () => {
        if (!elementRef.current) return;

        try {
            const module = await import('service_mfe/mount');
            const { mount } = module;

            const api = (mount as any)({ el: elementRef.current });

            apiRef.current = api;
            setIsLoaded(true);

            if (onLoadRef.current) onLoadRef.current();
            if (onApiReadyRef.current) onApiReadyRef.current(api);

        } catch (error) {
            console.error('Error loading service_mfe:', error);
        }
    };


    React.useEffect(() => {

        loadServiceMfe();

        return () => {

            if (apiRef.current?.unmount) {
                console.log('Unmounting service_mfe...');
                apiRef.current.unmount();
                apiRef.current = null;
            }
        };
    }, []); // Empty dependency array - effect runs only once

    // Expose API through ref
    useImperativeHandle(ref, () => ({
        getApi: () => apiRef.current,
        getLoaders: () => apiRef.current?.loaders || {
            fetchItems: false,
            addItem: false,
            removeItem: false,
            filterItems: false,
        },
        getErrors: () => apiRef.current?.errors || {
            fetchItems: null,
            addItem: null,
            removeItem: null,
            filterItems: null,
        }
    }), []);

    return <div ref={elementRef as React.RefObject<HTMLDivElement>} style={{ display: 'none' }} />;
});

Service_Mfe.displayName = 'Service_Mfe';

export default Service_Mfe;
