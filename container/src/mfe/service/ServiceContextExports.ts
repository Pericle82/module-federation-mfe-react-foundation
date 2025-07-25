// Re-export ServiceContext utilities for use in other MFEs
// Other MFEs can import these utilities if they need direct context access
import React from 'react';

export { 
  ServiceProvider, 
  useService, 
  useServiceFunctions, 
  useServiceState
} from './ServiceContext';

export type { ServiceApi } from './useService';
