/**
 * Module loader for microfrontends with explicit imports to help webpack analysis
 */

// Define explicit module loading functions for each microfrontend
const moduleLoaders = {
  'mfe_1/mount': () => import(/* webpackChunkName: "mfe_1" */ 'mfe_1/mount'),
  'mfe_2/mount': () => import(/* webpackChunkName: "mfe_2" */ 'mfe_2/mount'),
  'service_mfe/mount': () => import(/* webpackChunkName: "service_mfe" */ 'service_mfe/mount'),
  'users_mfe/mount': () => import(/* webpackChunkName: "users_mfe" */ 'users_mfe/mount'),
  'notifications_mfe/mount': () => import(/* webpackChunkName: "notifications_mfe" */ 'notifications_mfe/mount'),
} as const;

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
