/**
 * Mount/unmount plumbing shared by this remote's mount.tsx.
 *
 * Roots are cached in a WeakMap keyed by the host element (COMPREHENSIVE_GUIDE.md
 * § 7): remounting on the same <div> reuses the existing root instead of
 * creating a second one on the same container, which React rejects. WeakMap
 * rather than Map so a discarded element is not kept alive by this cache.
 *
 * `unmount()` tears down the React tree, which runs every useEffect cleanup in
 * the remote and therefore every bus unsubscribe (§ 5.2).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

// Global WeakMap to store roots for all MFEs
const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

// Utility functions for mounting/unmounting React components
export const mountUtils = {
  render: (el: HTMLElement, element: React.ReactElement) => {
    let root = roots.get(el);
    if (!root) {
      root = ReactDOM.createRoot(el);
      roots.set(el, root);
    }
    
    root.render(element);
    
    return {
      unmount: () => {
        root?.unmount();
        roots.delete(el);
      }
    };
  },

  unmount: (el: HTMLElement) => {
    const root = roots.get(el);
    if (root) {
      root.unmount();
      roots.delete(el);
    }
  }
};
