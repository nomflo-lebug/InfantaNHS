import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Tier 1: Maps JavaScript API & Map tile quota/auth failure handler
const prevAuthFailure = (window as unknown as {gm_authFailure?: () => void}).gm_authFailure;
(window as unknown as {gm_authFailure?: () => void}).gm_authFailure = () => {
  prevAuthFailure?.();
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  window.dispatchEvent(new CustomEvent('gmp-map-auth-failure'));
};
const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  origConsoleError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    window.dispatchEvent(new CustomEvent('gmp-map-auth-failure'));
  } else if (
    msg.includes('RefererNotAllowedMapError') ||
    msg.includes('ApiNotActivatedMapError') ||
    msg.includes('BillingNotEnabledMapError') ||
    msg.includes('InvalidKeyMapError') ||
    msg.includes('ApiProjectMapError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-map-auth-failure'));
  }
};

createRoot(document.getElementById('root')!).render(<App />);
