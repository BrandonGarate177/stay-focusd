import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import WebcamFeed from './Components/WebcamFeed';
import AttentionStatus from "./Components/AttentionStatus";
import StorageSettings from './Components/StorageSettings';
import StudyHabitsTracker from './Components/StudyHabitsTracker';
import CloseButton from './Components/CloseButton';


const INTERVAL_OPTIONS = [5, 6, 7, 8, 9, 10];

// Break Alert Component
const BreakAlert: React.FC<{
  duration: number;
  onBreakComplete: () => void;
}> = ({ duration, onBreakComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Play alert sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(err => console.error("Error playing sound:", err));

    // Request fullscreen
    if (appRef.current) {
      if (appRef.current.requestFullscreen) {
        appRef.current.requestFullscreen().catch(err => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      }
    }

    // Start countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Exit fullscreen
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
              console.error("Error attempting to exit fullscreen:", err);
            });
          }
          onBreakComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error("Error exiting fullscreen:", err);
        });
      }
    };
  }, [duration, onBreakComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={appRef} className="break-alert-container">
      <div className="break-alert">
        <h1>Break Time!</h1>
        <p>Time to rest your eyes and mind.</p>
        <div className="break-timer">{formatTime(timeLeft)}</div>
        <p className="break-message">Next work session will begin automatically.</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Settings and status state
  const [intervalSec, setIntervalSec] = useState(5);
  const [attentionStatus, setAttentionStatus] = useState<string>('...');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStudyHabits, setShowStudyHabits] = useState<boolean>(false);

  // Session state
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTimer, setSessionTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [pomodoroSettings, setPomodoroSettings] = useState({
    workDuration: 25,
    breakDuration: 5,
    cycles: 4
  });
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [showBreakAlert, setShowBreakAlert] = useState<boolean>(false);

  // Load Pomodoro settings on mount
  useEffect(() => {
    const loadPomodoroSettings = () => {
      try {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setPomodoroSettings({
            workDuration: settings.workDuration || 25,
            breakDuration: settings.breakDuration || 5,
            cycles: settings.cycles || 4
          });
        }
      } catch (error) {
        console.error('Failed to load pomodoro settings:', error);
      }
    };

    loadPomodoroSettings();

    // Listen for settings changes
    window.addEventListener('pomodoroSettingsUpdated', loadPomodoroSettings);

    // Listen for settings panel close requests
    const handleSettingsClose = () => setShowSettings(false);
    window.addEventListener('settingsCloseRequested', handleSettingsClose);

    return () => {
      window.removeEventListener('pomodoroSettingsUpdated', loadPomodoroSettings);
      window.removeEventListener('settingsCloseRequested', handleSettingsClose);
    };
  }, []);

  // Handle attention analysis results
  const handleResult = useCallback((result: { status: string; confidence: number }) => {
    setAttentionStatus(result.status);
    setConfidence(result.confidence);

    // Only log entry if session is active
    if (isSessionActive && currentSessionId && !isBreak) {
      const logEntry = {
        timestamp: Date.now(),
        status: result.status,
        confidence: result.confidence
      };

      window.electronAPI.addLogEntry(currentSessionId, logEntry)
        .then(response => {
          if (!response.success) {
            console.error('Failed to save log entry:', response.error);
          }
        })
        .catch(err => console.error('Error saving log entry:', err));
    }
  }, [isSessionActive, currentSessionId, isBreak]);

  // Start work session timer
  const startWorkSession = () => {
    setIsBreak(false);
    setSessionTimer(pomodoroSettings.workDuration * 60);

    // Start the timer
    const interval = setInterval(() => {
      setSessionTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleWorkComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerInterval(interval);
    console.log(`Started work session for cycle ${currentCycle}`);
  };

  // Handle work period complete
  const handleWorkComplete = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    // Show break alert
    setIsBreak(true);
    setShowBreakAlert(true);
    console.log('Work period complete. Starting break.');
  };

  // Handle break period complete
  const handleBreakComplete = () => {
    setShowBreakAlert(false);

    // If we've completed all cycles, end session
    if (currentCycle >= pomodoroSettings.cycles) {
      console.log('All pomodoro cycles complete');
      endSession();
      return;
    }

    // Otherwise, start next work session
    setCurrentCycle(prev => prev + 1);
    startWorkSession();
  };

  // Toggle session active state
  const toggleSession = async () => {
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };

  // Start a new session
  const startSession = async () => {
    try {
      const sessionConfig = {
        duration: pomodoroSettings.workDuration,
        breakInterval: pomodoroSettings.breakDuration,
        cycles: pomodoroSettings.cycles,
        goal: "Focus Session",
        tags: ["focus"]
      };

      const response = await window.electronAPI.startSession(sessionConfig);

      if (response.success && response.session) {
        setCurrentSessionId(response.session.id);
        setIsSessionActive(true);
        setCurrentCycle(1);

        // Start first work period
        startWorkSession();

        console.log(`Started new session: ${response.session.id}`);
      } else {
        console.error('Failed to start session:', response.error);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // End the current session
  const endSession = async () => {
    // Clear any active timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    if (currentSessionId) {
      try {
        const response = await window.electronAPI.endSession(currentSessionId);
        if (response.success) {
          console.log(`Session ended: ${currentSessionId}`);
        } else {
          console.error('Failed to end session:', response.error);
        }
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }

    // Reset all session state
    setCurrentSessionId(null);
    setIsSessionActive(false);
    setSessionTimer(0);
    setCurrentCycle(1);
    setIsBreak(false);
    setShowBreakAlert(false);
    setAttentionStatus('...');
    setConfidence(null);
  };

  // Format time for display (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  const toggleStudyHabits = () => {
    setShowStudyHabits(prev => !prev);
  };

  return (
    <div className="app-bg">
      {/* Mountain background created using CSS */}
      <div className="mountains"></div>

      {showBreakAlert ? (
        <BreakAlert
          duration={pomodoroSettings.breakDuration}
          onBreakComplete={handleBreakComplete}
        />
      ) : (
        <div className="minimal-layout">
          {/* Webcam display at the top */}
          <div className="webcam-wrapper">
            <WebcamFeed
              intervalSec={intervalSec}
              onResult={handleResult}
              isActive={isSessionActive}
            />
          </div>

          {/* Status row: Timer and Attention status side by side */}
          <div className="status-row">
            {/* Timer display - only when session is active */}
            {isSessionActive && (
              <div className="timer-display">
                <div className="timer-value">{formatTime(sessionTimer)}</div>
                <div className="timer-label">
                  {isBreak
                    ? 'Break Time'
                    : `Working (${currentCycle}/${pomodoroSettings.cycles})`
                  }
                </div>
              </div>
            )}

            {/* Attention status - only when session is active */}
            {isSessionActive && (
              <div className="attention-status">
                <AttentionStatus status={attentionStatus} confidence={confidence} />
              </div>
            )}
          </div>

          {/* Session control button */}
          <button
            className={`session-button ${isSessionActive ? 'stop' : 'start'}`}
            onClick={toggleSession}
          >
            {isSessionActive ? 'End Session' : 'Start Session'}
          </button>

          {/* Settings Button */}
          <button
            className="settings-btn"
            onClick={toggleSettings}
            title="Settings"
          >
            ⚙️
          </button>

          {/* Study Habits Tracker Button - new feature */}
          <button
            className="study-habits-btn"
            onClick={toggleStudyHabits}
            title="Study Habits Tracker"
          >
            📚
          </button>
        </div>
      )}

      {/* Overlay to detect clicks outside settings */}
      {showSettings && (
        <div
          className="settings-overlay"
          onClick={() => setShowSettings(false)}
        ></div>
      )}
      {/* Settings Panel */}
      <div className={`settings-panel ${!showSettings ? 'hidden' : ''}`}>
        <CloseButton onClose={() => setShowSettings(false)} position="bottom-right" />
        <StorageSettings />
      </div>

      {/* Study Habits Tracker Panel - new feature */}
      <div className={`study-habits-panel ${!showStudyHabits ? 'hidden' : ''}`}>
        <CloseButton onClose={() => setShowStudyHabits(false)} position="bottom-left" />
        <StudyHabitsTracker />
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
