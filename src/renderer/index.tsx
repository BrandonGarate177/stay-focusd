import React from 'react';
import { createRoot } from 'react-dom/client';
import Counter from './Counter';

function App() {
  return (
    <>
      <h1>Welcome to Stay Focusd!</h1>
      <Counter />
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
