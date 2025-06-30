import React, { useEffect, useRef, useState } from 'react';

interface WebcamFeedProps {
  intervalSec?: number;
  onResult: (result: { status: string; confidence: number }) => void;
}

const DEFAULT_INTERVAL = 5;

const WebcamFeed: React.FC<WebcamFeedProps> = ({ intervalSec = DEFAULT_INTERVAL, onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        // Optionally handle error (e.g., show a message)
      }
    };
    getWebcam();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log('WebcamFeed mounted. Endpoint:', import.meta.env.VITE_API_ENDPOINT);
    let intervalIdRef = { current: null as unknown as NodeJS.Timeout };
    const captureAndUpload = async () => {
      if (!videoRef.current) {
        console.log('videoRef.current is null');
        return;
      }
      console.log('videoRef.current.readyState:', videoRef.current.readyState);
      if (videoRef.current.readyState !== 4) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      const endpoint = import.meta.env.VITE_API_ENDPOINT;
      console.log('Attempting to POST to endpoint:', endpoint);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
        console.log('API response status:', res.status);
        const data = await res.json();
        console.log('API response data:', data);
        if (data && data.ml_result) {
          onResult({ status: data.ml_result.status, confidence: data.ml_result.confidence });
        } else {
          console.warn('API response missing ml_result:', data);
        }
      } catch (e) {
        console.error('API call failed:', e);
      }
    };
    intervalIdRef.current = setInterval(captureAndUpload, intervalSec * 1000);
    console.log('Interval set for captureAndUpload every', intervalSec, 'seconds');
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [intervalSec, onResult]);

  useEffect(() => {
    if (showVideo && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else if (!showVideo && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [showVideo]);

  const handleManualCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) {
      console.log('Manual: videoRef.current not ready');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    if (!blob) return;
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    const endpoint = import.meta.env.VITE_API_ENDPOINT;
    console.log('Manual: Attempting to POST to endpoint:', endpoint);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      console.log('Manual: API response status:', res.status);
      const data = await res.json();
      console.log('Manual: API response data:', data);
      if (data && data.ml_result) {
        onResult({ status: data.ml_result.status, confidence: data.ml_result.confidence });
      } else {
        console.warn('Manual: API response missing ml_result:', data);
      }
    } catch (e) {
      console.error('Manual: API call failed:', e);
    }
  };

  return (
    <>
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="main-card webcam-feed"
          style={{
            width: 297,
            height: 191,
            borderRadius: 39,
            objectFit: 'cover',
            position: 'absolute',
            left: 251,
            top: 23,
            background: 'rgba(217,217,217,0.5)',
            transform: 'scaleX(-1)',
            opacity: 0.7,
            transition: 'opacity 0.3s',
          }}
          data-opacity
        />
      ) : (
        <div
          className="main-card webcam-feed-off"
          style={{
            width: 297,
            height: 191,
            borderRadius: 39,
            position: 'absolute',
            left: 251,
            top: 23,
            background: 'rgba(30,30,30,0.85)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontFamily: 'Source Code Pro, monospace',
            textAlign: 'center',
            zIndex: 2,
            border: '2px dashed #665DCD',
          }}
        >
          <div>
            <div>Webcam is still active<br/>but hidden from view</div>
          </div>
        </div>
      )}
      <button
        onClick={() => setShowVideo((v) => !v)}
        style={{
          position: 'absolute',
          left: 251 + 297 - 36,
          top: 23 + 12,
          width: 24,
          height: 24,
          border: 'none',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
        title={showVideo ? 'Hide webcam' : 'Show webcam'}
      >
        {showVideo ? (
          // Eye icon (open)
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="7" ry="5"/><circle cx="12" cy="12" r="2"/></svg>
        ) : (
          // Eye-off icon (closed)
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11"/><path d="M1 1l22 22"/></svg>
        )}
      </button>
      <button
        onClick={handleManualCapture}
        style={{
          position: 'absolute',
          left: 251,
          top: 220,
          zIndex: 20,
          background: '#665DCD',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '4px 12px',
          fontFamily: 'Source Code Pro, monospace',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Test Endpoint
      </button>
    </>
  );
};

export default WebcamFeed;
