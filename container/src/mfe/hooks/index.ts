// Barrel for the host-side micro-frontend plumbing, so wrappers can import
// from './hooks'.
export { useMicrofrontend } from './useMicrofrontend';
export type { MicrofrontendHookOptions, MicrofrontendInstance } from './useMicrofrontend';

export { loadMicrofrontendModule, isValidModuleName } from './moduleLoader';
export type { MicrofrontendModuleName } from './moduleLoader';
