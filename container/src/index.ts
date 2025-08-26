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