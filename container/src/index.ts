/**
 * Host entry point - and nothing else on purpose.
 *
 * The dynamic `import('./bootstrap')` below is the Module Federation "async
 * boundary" (COMPREHENSIVE_GUIDE.md § 3.2), not a stylistic choice. Before any
 * shared module is evaluated, the MF runtime has to initialise the share scope
 * and call `init()` on the remote containers. A static import of `./bootstrap`
 * would be evaluated in the same tick as this entry, before that handshake is
 * done, and the `shared` modules would fail to resolve.
 *
 * Splitting here produces two chunks - `main.js` (runtime + share scope init)
 * and `src_bootstrap_tsx.js` (the actual app) - with the initialisation in
 * between.
 */

// NOTE: declared inside a module, so this is a *local* interface, not a global
// augmentation - and neither global below is read anywhere (§ 10.7).
interface Window {
    poc_service_url: string;
    poc_service: string;
}

window.poc_service_url = window.poc_service_url || 'http://localhost:3000';
window.poc_service = window.poc_service || 'poc_service';

import('./bootstrap').then(() => {
  console.log('Bootstrap loaded successfully');
}).catch(error => {
  console.error('Failed to load bootstrap:', error);
});
