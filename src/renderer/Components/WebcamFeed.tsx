import React, { useEffect, useRef, useState } from 'react';
import { config } from '../config';

interface WebcamFeedProps {
  intervalSec?: number;
  onResult: (result: { status: string; confidence: number }) => void;
  isActive?: boolean; // Add isActive prop to control API calls
  width?: number;  // optional width in pixels
  height?: number; // optional height in pixels
}

const DEFAULT_INTERVAL = 5;
const DEFAULT_WIDTH = 297;
const DEFAULT_HEIGHT = 191;

const WebcamFeed: React.FC<WebcamFeedProps> = ({
  intervalSec = DEFAULT_INTERVAL,
  onResult,
  isActive = false, // Default to false, meaning no API calls
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
}) => {
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
    // Only set up interval if isActive is true
    if (!isActive) return;

    // Check if endpoint is configured
    if (!config.endpoint) {
      console.error('API endpoint not configured. Please set VITE_ENDPOINT in your .env file.');
      return;
    }

    let intervalIdRef = { current: null as unknown as NodeJS.Timeout };
    const captureAndUpload = async () => {
      if (!videoRef.current) return;
      if (videoRef.current.readyState !== 4) return;

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      if (!blob) return;

      const endpoint = config.endpoint;
      try {
        // Use Electron IPC bridge instead of fetch API to bypass CORS
        if (window.electronAPI) {
          // Pass blob and endpoint separately instead of FormData
          const data = await window.electronAPI.uploadImage(blob, endpoint);
          if (data && data.ml_result) {
            onResult({ status: data.ml_result.status, confidence: data.ml_result.confidence });
          }
        } else {
          // Fallback to direct fetch if not in Electron environment (e.g. browser preview)
          const formData = new FormData();
          formData.append('image', blob, 'frame.jpg');
          const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data && data.ml_result) {
            onResult({ status: data.ml_result.status, confidence: data.ml_result.confidence });
          }
        }
      } catch (e) {
        console.error('API call failed:', e);
      }
    };

    // Only start interval if isActive is true
    intervalIdRef.current = setInterval(captureAndUpload, intervalSec * 1000);

    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [intervalSec, onResult, isActive]); // Add isActive to dependency array

  useEffect(() => {
    if (showVideo && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else if (!showVideo && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [showVideo]);

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
            width,
            height,
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
            width,
            height,
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
          }}
        >
          <div>
            <div>Webcam is still active</div>
          </div>
        </div>
      )}
      <button
        onClick={() => setShowVideo((v) => !v)}
        style={{
          position: 'absolute',
          left: 251 + width - 36,
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
    </>
  );
};

export default WebcamFeed;
