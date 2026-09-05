/**
 * Static registry of the federated modules the host may load
 * (COMPREHENSIVE_GUIDE.md § 3.4).
 *
 * Why this file exists: webpack has to analyse every federated import
 * *statically* to generate the remoteEntry/init/get sequence for it. A call
 * like `import(someVariable)` cannot be analysed and would fail at runtime.
 * Keeping the specifiers as literals in a map gives webpack what it needs while
 * still letting `useMicrofrontend` take the module name as a parameter.
 *
 * This is one of the three host-side places to update when adding a remote -
 * the others are `remotes` in webpack.config.js and remotes.d.ts.
 */

// Define explicit module loading functions for each microfrontend.
// The `webpackChunkName` magic comment names the generated chunk, which makes
// the network waterfall readable when debugging a remote that fails to load.
const moduleLoaders = {
  'mfe_1/mount': () => import(/* webpackChunkName: "mfe_1" */ 'mfe_1/mount'),
  'mfe_2/mount': () => import(/* webpackChunkName: "mfe_2" */ 'mfe_2/mount'),
  'service_mfe/mount': () => import(/* webpackChunkName: "service_mfe" */ 'service_mfe/mount'),
  'users_mfe/mount': () => import(/* webpackChunkName: "users_mfe" */ 'users_mfe/mount'),
  'notifications_mfe/mount': () => import(/* webpackChunkName: "notifications_mfe" */ 'notifications_mfe/mount'),
} as const;

// `as const` above keeps the keys literal, so this union rejects any module
// name that is not actually registered - at compile time.
export type MicrofrontendModuleName = keyof typeof moduleLoaders;

/**
 * Loads a microfrontend module using predefined loaders
 * This approach helps webpack understand the imports statically
 */
export async function loadMicrofrontendModule(moduleName: MicrofrontendModuleName) {
  const loader = moduleLoaders[moduleName];
  if (!loader) {
    throw new Error(`Unknown microfrontend module: ${moduleName}`);
  }
  return await loader();
}

/**
 * Check if a module name is valid
 */
export function isValidModuleName(moduleName: string): moduleName is MicrofrontendModuleName {
  return moduleName in moduleLoaders;
}
