import React, { useState, useEffect } from 'react';

interface StorageSettingsProps {
  onClose?: () => void;
}

/**
 * Component for managing storage and timer settings
 * Allows users to configure storage location and Pomodoro timer settings
 */
const StorageSettings: React.FC<StorageSettingsProps> = ({ onClose }) => {
  // Storage settings state
  const [storagePath, setStoragePath] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastAction, setLastAction] = useState<string>('');
  const [maxSessions, setMaxSessions] = useState<number>(100);

  // Pomodoro timer settings state
  const [workDuration, setWorkDuration] = useState<number>(25);
  const [breakDuration, setBreakDuration] = useState<number>(5);
  const [cycles, setCycles] = useState<number>(4);

  // Input values for form fields (possibly invalid until validated)
  const [workInput, setWorkInput] = useState<string>('25');
  const [breakInput, setBreakInput] = useState<string>('5');
  const [cyclesInput, setCyclesInput] = useState<string>('4');
  const [maxSessionsInput, setMaxSessionsInput] = useState<string>('100');

  // Load current storage path when component mounts
  useEffect(() => {
    loadStoragePath();
    loadPomodoroSettings();
    loadMaxSessions();
  }, []);

  const loadStoragePath = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getStoragePath();
      if (result.success) {
        setStoragePath(result.storagePath);
        setIsDefault(result.isDefault);
        console.log(`Current storage path: ${result.storagePath} (${result.isDefault ? 'Default' : 'Custom'})`);
      }
    } catch (error) {
      console.error('Failed to load storage path:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPomodoroSettings = () => {
    try {
      const savedSettings = localStorage.getItem('pomodoroSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        const work = settings.workDuration || 25;
        const breakTime = settings.breakDuration || 5;
        const cycleCount = settings.cycles || 4;

        setWorkDuration(work);
        setBreakDuration(breakTime);
        setCycles(cycleCount);

        setWorkInput(work.toString());
        setBreakInput(breakTime.toString());
        setCyclesInput(cycleCount.toString());
      }
    } catch (error) {
      console.error('Failed to load pomodoro settings:', error);
    }
  };

  const loadMaxSessions = async () => {
    try {
      const result = await window.electronAPI.getStorageStats();
      if (result.success && result.stats) {
        // Get the max sessions from local storage if available
        const savedMaxSessions = localStorage.getItem('maxSessions');
        if (savedMaxSessions) {
          const max = parseInt(savedMaxSessions);
          setMaxSessions(max);
          setMaxSessionsInput(max.toString());

          // Apply this setting to the storage service
          await window.electronAPI.setMaxSessions(max);
        }
      }
    } catch (error) {
      console.error('Failed to load max sessions setting:', error);
    }
  };

  // Validate that a number is positive and within range
  const validateNumber = (value: string, min: number, max: number, defaultVal: number): number => {
    const num = parseInt(value);
    if (isNaN(num) || num < min) {
      return defaultVal;
    }
    return Math.min(num, max);
  };

  const savePomodoroSettings = () => {
    try {
      // Validate all inputs
      const validWork = validateNumber(workInput, 1, 120, 25);
      const validBreak = validateNumber(breakInput, 1, 60, 5);
      const validCycles = validateNumber(cyclesInput, 1, 10, 4);

      // Update state with validated values
      setWorkDuration(validWork);
      setBreakDuration(validBreak);
      setCycles(validCycles);

      // Update input fields with validated values
      setWorkInput(validWork.toString());
      setBreakInput(validBreak.toString());
      setCyclesInput(validCycles.toString());

      const settings = {
        workDuration: validWork,
        breakDuration: validBreak,
        cycles: validCycles
      };
      localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
      setLastAction('Pomodoro settings saved');
      console.log('Pomodoro settings saved:', settings);

      // Dispatch events to notify app component
      window.dispatchEvent(new CustomEvent('pomodoroSettingsUpdated'));
      window.dispatchEvent(new CustomEvent('settingsCloseRequested'));
    } catch (error) {
      console.error('Failed to save pomodoro settings:', error);
      setLastAction('Failed to save Pomodoro settings');
    }
  };

  const saveMaxSessions = async () => {
    try {
      // Validate max sessions
      const validMax = validateNumber(maxSessionsInput, 5, 1000, 100);
      setMaxSessions(validMax);
      setMaxSessionsInput(validMax.toString());

      // Save to local storage
      localStorage.setItem('maxSessions', validMax.toString());

      // Apply to storage service
      const result = await window.electronAPI.setMaxSessions(validMax);
      if (result.success) {
        setLastAction(`Maximum sessions limit set to ${validMax}`);
        console.log(`Maximum sessions limit set to ${validMax}`);

        // Request to close settings
        window.dispatchEvent(new CustomEvent('settingsCloseRequested'));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to save max sessions setting:', error);
      setLastAction('Failed to save max sessions setting');
    }
  };

  const handleSelectPath = async () => {
    setLastAction('Selecting new storage location...');
    try {
      const result = await window.electronAPI.selectStoragePath();
      if (result.success && result.storagePath) {
        setStoragePath(result.storagePath);
        setIsDefault(false);
        setLastAction(`Storage location changed to: ${result.storagePath}`);
        console.log(`Storage location changed to: ${result.storagePath}`);

        // Request to close settings
        window.dispatchEvent(new CustomEvent('settingsCloseRequested'));
      } else if (result.error) {
        setLastAction(`Failed to change storage: ${result.error}`);
        console.error('Failed to change storage location:', result.error);
      } else {
        setLastAction('Selection canceled');
        console.log('Storage selection canceled');
      }
    } catch (error) {
      setLastAction('An error occurred while changing storage location');
      console.error('Error changing storage location:', error);
    }
  };

  return (
    <div className="storage-settings-container">
      <h3 className="settings-header">Settings</h3>

      {/* Pomodoro Timer Settings */}
      <div className="settings-group">
        <h4 className="settings-subheader">Pomodoro Timer</h4>

        <div className="settings-row">
          <label htmlFor="work-duration">Work Duration (minutes)</label>
          <input
            id="work-duration"
            type="number"
            min="1"
            max="120"
            value={workInput}
            onChange={(e) => setWorkInput(e.target.value)}
            className="number-input"
          />
        </div>

        <div className="settings-row">
          <label htmlFor="break-duration">Break Duration (minutes)</label>
          <input
            id="break-duration"
            type="number"
            min="1"
            max="60"
            value={breakInput}
            onChange={(e) => setBreakInput(e.target.value)}
            className="number-input"
          />
        </div>

        <div className="settings-row">
          <label htmlFor="cycles">Cycles</label>
          <input
            id="cycles"
            type="number"
            min="1"
            max="10"
            value={cyclesInput}
            onChange={(e) => setCyclesInput(e.target.value)}
            className="number-input"
          />
        </div>

        <div className="total-time">
          Total Session Time: {(workDuration * cycles) + (breakDuration * (cycles - 1))} minutes
        </div>

        <button
          className="save-settings-btn"
          onClick={savePomodoroSettings}
        >
          Save Timer Settings
        </button>
      </div>

      {/* Storage Settings */}
      <div className="settings-group">
        <h4 className="settings-subheader">Data Storage</h4>

        <div className="setting-info">
          <label>Focus Data Storage Location:</label>
          <div className="storage-path">
            {isLoading ? 'Loading...' : (
              <>
                <span className="path-text">{storagePath}</span>
                {isDefault && <span className="default-badge">Default</span>}
              </>
            )}
          </div>
        </div>

        <button
          className="change-location-btn"
          onClick={handleSelectPath}
          disabled={isLoading}
        >
          Change Location
        </button>

        <div className="settings-row max-sessions-row">
          <label htmlFor="max-sessions">Maximum Sessions</label>
          <input
            id="max-sessions"
            type="number"
            min="5"
            max="1000"
            value={maxSessionsInput}
            onChange={(e) => setMaxSessionsInput(e.target.value)}
            className="number-input"
          />
        </div>

        <button
          className="save-settings-btn"
          onClick={saveMaxSessions}
        >
          Save & Apply
        </button>

        <div className="help-text storage-help">
          <p>Older sessions will be automatically deleted when the limit is reached.</p>
          <p>Higher limits may use more disk space but provide more historical data.</p>
        </div>
      </div>


    </div>

  );
};

export default StorageSettings;
