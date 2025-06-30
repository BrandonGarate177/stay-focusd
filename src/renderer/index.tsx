import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <h1>Welcome to Stay Focusd!</h1>;
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

