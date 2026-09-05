import React, { useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * Host-side wrapper for `service_mfe` - the headless data layer + event bus
 * (COMPREHENSIVE_GUIDE.md § 4.2, § 5.1).
 *
 * Different from the other four wrappers in three ways, all consequences of the
 * fact that this remote has no UI:
 *
 *   - it renders a `display: none` div: the node exists only because mount()
 *     requires one;
 *   - what matters is mount()'s *return value*, the whole `ServiceMfeApi`,
 *     which is handed to the host through `onApiReady` and from there to every
 *     other MFE as a prop;
 *   - it deliberately does not use `useMicrofrontend`: it mounts once with an
 *     empty dependency array, because remounting the service would strand the
 *     listeners other MFEs have already registered on the module-level Sets
 *     (§ 5.1, consequence 3).
 */

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

    // Callbacks are kept in refs so the mount effect below can stay on `[]`:
    // reading them through a ref means a new inline arrow from the parent does
    // not invalidate the effect. (This is the pattern § 10.2 recommends for
    // useMicrofrontend, which does not yet apply it.)
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

            // Unlike the UI remotes, mount() here returns the API itself -
            // synchronously, through the facade described in § 4.2.
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
    }, []); // Mount exactly once - see the note in the file header.

    // Imperative escape hatch for the host. `getLoaders`/`getErrors` read the
    // same non-reactive getters described in § 10.1: a snapshot, with no
    // subscription behind it.
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

    // Headless: the node is just the mount target React needs.
    return <div ref={elementRef as React.RefObject<HTMLDivElement>} style={{ display: 'none' }} />;
});

Service_Mfe.displayName = 'Service_Mfe';

export default Service_Mfe;
