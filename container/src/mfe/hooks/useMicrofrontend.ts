import { useEffect, useRef, useCallback } from 'react';
import { loadMicrofrontendModule, isValidModuleName, MicrofrontendModuleName } from './moduleLoader';

/**
 * The single place where the host drives a remote's lifecycle
 * (COMPREHENSIVE_GUIDE.md § 7).
 *
 * The contract with every remote is one function: `mount({ el, ...props })`
 * returns a handle with `unmount()` (and optionally `updateProps()`). The host
 * never renders anything inside `el` - from the moment it is handed over, that
 * subtree belongs to the remote, which creates its own React root on it.
 *
 * Responsibilities kept here so the wrappers stay ~20 lines each:
 *   - lazy `import()` of the federated module through the static loader map;
 *   - retry with backoff when a remote's dev server is not up yet, which is
 *     what makes an imperfect startup order survivable (§ 3.3);
 *   - unmount on cleanup, which cascades into the remote's own effect cleanups
 *     and therefore into every bus unsubscribe (§ 5.2);
 *   - `updateProps` as an alternative to a full remount.
 */
export interface MicrofrontendHookOptions<T = any> {
  /**
   * The name of the microfrontend module to import (e.g., 'mfe_1/mount')
   */
  moduleName: MicrofrontendModuleName;
  
  /**
   * Props to pass to the mount function
   */
  mountProps?: T;
  
  /**
   * Callback to execute when the microfrontend is successfully loaded
   */
  onLoad?: () => void;
  
  /**
   * Whether the microfrontend should be mounted (useful for conditional rendering)
   */
  isReady?: boolean;
  
  /**
   * Dependencies array for when to remount the microfrontend
   */
  dependencies?: any[];
  
  /**
   * Whether to update props on the instance when dependencies change
   */
  updatePropsOnChange?: boolean;
  
  /**
   * Whether to retry loading the microfrontend if it fails initially
   */
  retryOnFailure?: boolean;
  
  /**
   * Number of retry attempts (default: 3)
   */
  maxRetries?: number;
  
  /**
   * Delay between retry attempts in milliseconds (default: 1000)
   */
  retryDelay?: number;
}

export interface MicrofrontendInstance {
  unmount?: () => void;
  updateProps?: (props: any) => void;
}

/**
 * Custom hook for managing microfrontend mounting, unmounting, and lifecycle
 */
export function useMicrofrontend<T = any>(options: MicrofrontendHookOptions<T>) {
  const {
    moduleName,
    mountProps,
    onLoad,
    isReady = true,
    dependencies = [],
    updatePropsOnChange = false,
    retryOnFailure = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  // The only DOM contact point: this <div> is passed to the remote's mount().
  const elementRef = useRef<HTMLElement>(null);
  // Handle returned by mount(), needed to unmount / updateProps later.
  const instanceRef = useRef<MicrofrontendInstance | null>(null);
  // `onLoad` must fire once per hook instance, not on every remount.
  const hasLoadedRef = useRef(false);
  const retryCountRef = useRef(0);

  // Function to attempt mounting with retry logic
  const attemptMount = useCallback(async (): Promise<void> => {
    if (!elementRef.current) return;
    
    // Validate module name before attempting to load
    if (!isValidModuleName(moduleName)) {
      console.error(`Invalid microfrontend module name: ${moduleName}`);
      return;
    }
    
    try {
      // Use the explicit module loader to help webpack understand the imports.
      // This await is where the MF runtime injects <script remoteEntry.js>,
      // calls init(shareScope) and resolves the exposed factory (§ 3.3).
      const module = await loadMicrofrontendModule(moduleName);
      const { mount } = module;
      
      // The mount contract: always `el`, plus whatever the wrapper passes
      // (in practice `{ serviceApi }`).
      const mountArgs = {
        el: elementRef.current as HTMLElement,
        ...(mountProps || {})
      };
      
      // Mount the microfrontend with type assertion to handle dynamic typing
      instanceRef.current = (mount as any)(mountArgs);

      // Trigger onLoad callback if provided and this is the first mount
      if (onLoad && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        onLoad();
      }
      
      // Reset retry count on successful mount
      retryCountRef.current = 0;
      
    } catch (error) {
      console.error(`Error loading microfrontend ${moduleName}:`, error);
      
      // A failure here usually means the remote's dev server is not answering
      // yet, so the import of remoteEntry.js was rejected. Retrying on a timer
      // (5 x 2s from the wrappers) covers a slow or out-of-order startup.
      if (retryOnFailure && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retrying to load ${moduleName} (attempt ${retryCountRef.current}/${maxRetries}) in ${retryDelay}ms...`);
        
        setTimeout(() => {
          attemptMount();
        }, retryDelay);
      } else if (retryCountRef.current >= maxRetries) {
        console.error(`Failed to load ${moduleName} after ${maxRetries} attempts`);
      }
    }
  }, [moduleName, mountProps, onLoad, retryOnFailure, maxRetries, retryDelay]);

  // Mount/unmount effect.
  // KNOWN ISSUE (§ 10.2): `attemptMount` is in the dependency array and depends
  // on `mountProps`/`onLoad`, which the wrappers rebuild on every host render -
  // so every re-render of <App> unmounts and remounts every remote, losing its
  // local state. Harmless today (<App> renders twice), a bug as soon as the
  // host gains more state. Fix: useMemo the props, keep onLoad in a ref.
  useEffect(() => {
    if (!isReady) return;
    
    let isMounted = true;
    
    // Reset retry count when effect runs
    retryCountRef.current = 0;
    
    if (isMounted) {
      attemptMount();
    }

    // Unmounting the remote triggers, inside the remote, root.unmount() ->
    // every useEffect cleanup -> every bus unsubscribe. Nothing leaks as long
    // as this runs.
    return () => {
      isMounted = false;
      if (instanceRef.current?.unmount) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [moduleName, isReady, attemptMount, ...dependencies]);

  // Opt-in alternative to remounting: hand the new props to the live instance.
  // Only mfe_2 exposes `updateProps`, and the dependency array is deliberately
  // empty when the option is off so the effect never fires.
  useEffect(() => {
    if (updatePropsOnChange && instanceRef.current?.updateProps && mountProps) {
      instanceRef.current.updateProps(mountProps);
    }
  }, updatePropsOnChange ? [mountProps, ...dependencies] : []);

  return {
    elementRef,
    instance: instanceRef.current,
    isLoaded: hasLoadedRef.current
  };
}
