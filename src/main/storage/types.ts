/**
 * Type definitions for the local storage system
 */

/**
 * Represents a single attention log entry
 */
export interface AttentionLogEntry {
  timestamp: number;        // Unix timestamp (milliseconds)
  status: string;           // "attentive", "distracted", etc.
  confidence: number;       // 0-1 confidence value
  metadata?: Record<string, any>;  // Optional additional data
}

/**
 * Session configuration parameters
 */
export interface SessionConfig {
  duration?: number;        // Session duration in minutes
  breakInterval?: number;   // Break interval in minutes
  goal?: string;            // Session goal/description
  tags?: string[];          // Optional tags for categorization
}

/**
 * Represents a full session
 */
export interface Session {
  id: string;               // Unique session ID (usually derived from timestamp)
  startTime: number;        // Unix timestamp when session started
  endTime?: number;         // Unix timestamp when session ended (optional if ongoing)
  config: SessionConfig;    // Session configuration
  logs: AttentionLogEntry[]; // Array of attention log entries
}

/**
 * Global metadata stored separately
 */
export interface StorageMetadata {
  lastSessionId?: string;   // ID of the most recent session
  sessionCount: number;     // Total number of sessions stored
  totalLogEntries: number;  // Total log entries across all sessions
  oldestSession?: string;   // ID of the oldest session still stored
  version: string;          // Schema version for future-proofing
}

/**
 * Search query parameters
 */
export interface SearchParams {
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
export interface SearchResults {
  entries: Array<{
    sessionId: string;      // ID of the session containing the match
    entry: AttentionLogEntry; // The matching log entry
  }>;
  total: number;            // Total matches found
}
