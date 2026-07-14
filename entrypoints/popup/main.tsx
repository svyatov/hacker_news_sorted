import { createRoot } from 'react-dom/client';

import App from './App';

// Plasmo mounted the popup component implicitly; WXT needs an explicit HTML entrypoint + mount (KTD-4).
createRoot(document.getElementById('app')!).render(<App />);
