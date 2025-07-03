/**
 * TypeScript declarations for Electron API exposed through preload.js
 */

interface ElectronAPI {
  /**
   * Upload an image to a specified endpoint
   */
  uploadImage: (blob: Blob, endpoint: string) => Promise<any>;

  /**
   * Start a new focus tracking session
   */
  startSession: (sessionConfig: SessionConfig) => Promise<{
    success: boolean;
    session?: Session;
    error?: string;
  }>;

  /**
   * Add a log entry to an existing session
   */
  addLogEntry: (sessionId: string, entry: AttentionLogEntry) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * End a session
   */
  endSession: (sessionId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Search for entries in stored sessions
   */
  searchSessions: (searchParams: SearchParams) => Promise<{
    success: boolean;
    results?: SearchResults;
    error?: string;
  }>;

  /**
   * Get storage statistics
   */
  getStorageStats: () => Promise<{
    success: boolean;
    stats?: {
      sessionCount: number;
      totalLogEntries: number;
      oldestSession?: string;
      newestSession?: string;
      diskUsage: number;
    };
    error?: string;
  }>;

  /**
   * Open a folder selection dialog for the user to choose where to store data
   */
  selectStoragePath: () => Promise<{
    success: boolean;
    storagePath?: string;
    error?: string;
  }>;

  /**
   * Get the current storage path
   */
  getStoragePath: () => Promise<{
    success: boolean;
    storagePath: string;
    isDefault: boolean;
  }>;

  /**
   * Set the maximum number of sessions to keep
   */
  setMaxSessions: (maxSessions: number) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Type definitions for storage data model
 */

/**
 * Represents a single attention log entry
 */
interface AttentionLogEntry {
  timestamp: number;        // Unix timestamp (milliseconds)
  status: string;           // "attentive", "distracted", etc.
  confidence: number;       // 0-1 confidence value
  metadata?: Record<string, any>;  // Optional additional data
}

/**
 * Session configuration parameters
 */
interface SessionConfig {
  duration?: number;        // Session duration in minutes
  breakInterval?: number;   // Break interval in minutes
  goal?: string;            // Session goal/description
  tags?: string[];          // Optional tags for categorization
}

/**
 * Represents a full session
 */
interface Session {
  id: string;               // Unique session ID (usually derived from timestamp)
  startTime: number;        // Unix timestamp when session started
  endTime?: number;         // Unix timestamp when session ended (optional if ongoing)
  config: SessionConfig;    // Session configuration
  logs: AttentionLogEntry[]; // Array of attention log entries
}

/**
 * Search query parameters
 */
interface SearchParams {
  timeRange?: {
    start: number;          // Start timestamp
    end: number;            // End timestamp
  };
  status?: string;          // Filter by status
  minConfidence?: number;   // Minimum confidence threshold
  maxConfidence?: number;   // Maximum confidence threshold
  tags?: string[];          // Filter by tags
  text?: string;            // Full-text search query
  limit?: number;           // Maximum results to return
  offset?: number;          // Pagination offset
}

/**
 * Search results
 */
interface SearchResults {
  entries: Array<{
    sessionId: string;      // ID of the session containing the match
    entry: AttentionLogEntry; // The matching log entry
  }>;
  total: number;            // Total matches found
}

/**
 * Declare electronAPI on window
 */
declare interface Window {
  electronAPI: ElectronAPI;
}
