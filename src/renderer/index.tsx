import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import WebcamFeed from './Components/WebcamFeed';
import AttentionStatus from "./Components/AttentionStatus";


const INTERVAL_OPTIONS = [5, 6, 7, 8, 9, 10];

const App: React.FC = () => {
  const [intervalSec, setIntervalSec] = useState(5);
  const [attentionStatus, setAttentionStatus] = useState<string>('...');
  const [confidence, setConfidence] = useState<number | null>(null);

  const handleResult = useCallback((result: { status: string; confidence: number }) => {
    setAttentionStatus(result.status);
    setConfidence(result.confidence);
  }, []);

  return (
    <div className="app-bg">


      {/*  THIS IS THE WEBCAM CONTAINER*/}
      <WebcamFeed intervalSec={intervalSec} onResult={handleResult} />


      {/*  LOCKED IN / SLUMPED  + background  */}
        <AttentionStatus status={attentionStatus} confidence={confidence} />




      <div className="locked-in-card" />
      <div className="graph-card" />



    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
