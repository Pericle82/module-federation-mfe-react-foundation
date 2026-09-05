/**
 * Mount/unmount plumbing for this remote (COMPREHENSIVE_GUIDE.md § 7).
 *
 * Simpler - and weaker - than the WeakMap version used by the other three
 * remotes: a single module-level `root` means only one mount target is
 * supported at a time, so mounting a second instance would unmount the first.
 * Fine here, since the container mounts this remote exactly once.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// One root for the whole module - see the caveat above.
let root: Root | null = null;

export const mountUtils = {
  render: (el: HTMLElement, component: React.ReactElement): { unmount: () => void } => {
    if (root) {
      mountUtils.unmount(el);
    }
    
    root = createRoot(el);
    root.render(component);
    
    return {
      unmount: () => mountUtils.unmount(el)
    };
  },
  
  unmount: (el: HTMLElement) => {
    if (root) {
      root.unmount();
      root = null;
      // Belt and braces: React empties the container itself, this guards
      // against anything left behind by a partially failed render.
      el.innerHTML = '';
    }
  }
};