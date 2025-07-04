import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
  Session,
  AttentionLogEntry,
  StorageMetadata,
  SearchParams,
  SearchResults
} from './types';

/**
 * Service responsible for managing local file-based storage
 * of attention tracking sessions
 */
export class StorageService {
  private basePath: string;
  private sessionsPath: string;
  private metadataPath: string;
  private indexPath: string;
  private metadata: StorageMetadata = this.createDefaultMetadata(); // Initialize with default value
  private maxSessions: number = 100; // Default limit of sessions to keep

  constructor(customPath?: string) {
    // Use custom path or default to user data directory
    this.basePath = customPath || path.join(app.getPath('userData'), 'focus-data');
    this.sessionsPath = path.join(this.basePath, 'sessions');
    this.metadataPath = path.join(this.basePath, 'metadata.json');
    this.indexPath = path.join(this.basePath, 'search-index');

    // Initialize storage
    this.initializeStorage();
  }

  /**
   * Set up the storage directory structure
   */
  private initializeStorage(): void {
    // Create directories if they don't exist
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }

    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath);
    }

    if (!fs.existsSync(this.indexPath)) {
      fs.mkdirSync(this.indexPath);
    }

    // Initialize or load metadata
    if (fs.existsSync(this.metadataPath)) {
      try {
        const data = fs.readFileSync(this.metadataPath, 'utf8');
        this.metadata = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load metadata, creating new:', error);
        this.metadata = this.createDefaultMetadata();
        this.saveMetadata();
      }
    } else {
      this.metadata = this.createDefaultMetadata();
      this.saveMetadata();
    }
  }

  /**
   * Create default metadata structure
   */
  private createDefaultMetadata(): StorageMetadata {
    return {
      sessionCount: 0,
      totalLogEntries: 0,
      version: '1.0'
    };
  }

  /**
   * Save metadata to disk
   */
  private saveMetadata(): void {
    fs.writeFileSync(
      this.metadataPath,
      JSON.stringify(this.metadata, null, 2),
      'utf8'
    );
  }

  /**
   * Configure the maximum number of sessions to keep
   */
  public setMaxSessions(count: number): void {
    this.maxSessions = count;
    this.pruneOldSessions();
  }

  /**
   * Start a new tracking session
   */
  public startSession(config: Session['config']): Session {
    const timestamp = Date.now();
    const id = new Date(timestamp).toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);

    const newSession: Session = {
      id,
      startTime: timestamp,
      config,
      logs: []
    };

    // Save to disk
    this.saveSession(newSession);

    // Update metadata
    this.metadata.lastSessionId = id;
    this.metadata.sessionCount++;
    if (!this.metadata.oldestSession) {
      this.metadata.oldestSession = id;
    }
    this.saveMetadata();

    return newSession;
  }

  /**
   * Add a log entry to an existing session
   */
  public addLogEntry(sessionId: string, entry: AttentionLogEntry): boolean {
    const sessionPath = path.join(this.sessionsPath, `${sessionId}.json`);

    try {
      if (!fs.existsSync(sessionPath)) {
        return false;
      }

      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as Session;
      sessionData.logs.push(entry);

      // Save updated session
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

      // Update metadata
      this.metadata.totalLogEntries++;
      this.saveMetadata();

      // Update search index
      this.indexLogEntry(sessionId, entry);

      return true;
    } catch (error) {
      console.error(`Failed to add log entry to session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * End an active session
   */
  public endSession(sessionId: string): boolean {
    const sessionPath = path.join(this.sessionsPath, `${sessionId}.json`);

    try {
      if (!fs.existsSync(sessionPath)) {
        return false;
      }

      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as Session;
      sessionData.endTime = Date.now();

      // Save updated session
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

      return true;
    } catch (error) {
      console.error(`Failed to end session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Save a session to disk
   */
  private saveSession(session: Session): void {
    const filePath = path.join(this.sessionsPath, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));

    // Check if we need to prune old sessions
    this.pruneOldSessions();
  }

  /**
   * Get a session by ID
   */
  public getSession(sessionId: string): Session | null {
    const sessionPath = path.join(this.sessionsPath, `${sessionId}.json`);

    try {
      if (!fs.existsSync(sessionPath)) {
        return null;
      }

      return JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as Session;
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get all session IDs, optionally within a time range
   */
  public getSessionIds(startTime?: number, endTime?: number): string[] {
    try {
      const files = fs.readdirSync(this.sessionsPath);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      if (!startTime && !endTime) {
        return sessionFiles.map(file => file.replace('.json', ''));
      }

      // If time range specified, filter sessions
      const filteredSessions: string[] = [];

      for (const file of sessionFiles) {
        const sessionPath = path.join(this.sessionsPath, file);
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as Session;

        const sessionStart = sessionData.startTime;
        const sessionEnd = sessionData.endTime || Date.now();

        // Include if session overlaps with the requested time range
        if ((!startTime || sessionEnd >= startTime) &&
            (!endTime || sessionStart <= endTime)) {
          filteredSessions.push(file.replace('.json', ''));
        }
      }

      return filteredSessions;
    } catch (error) {
      console.error('Failed to get session IDs:', error);
      return [];
    }
  }

  /**
   * Delete sessions older than the limit
   */
  private pruneOldSessions(): void {
    try {
      const files = fs.readdirSync(this.sessionsPath);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      if (sessionFiles.length <= this.maxSessions) {
        return;
      }

      // Sort by file creation date (which corresponds to session start time)
      const sortedFiles = sessionFiles.sort((a, b) => {
        const statsA = fs.statSync(path.join(this.sessionsPath, a));
        const statsB = fs.statSync(path.join(this.sessionsPath, b));
        return statsA.birthtimeMs - statsB.birthtimeMs;
      });

      // Delete oldest files beyond the limit
      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - this.maxSessions);

      for (const file of filesToDelete) {
        fs.unlinkSync(path.join(this.sessionsPath, file));
        console.log(`Pruned old session: ${file}`);
      }

      // Update metadata
      if (filesToDelete.length > 0) {
        this.metadata.sessionCount -= filesToDelete.length;
        // Update oldest session reference
        if (sortedFiles.length > filesToDelete.length) {
          this.metadata.oldestSession = sortedFiles[filesToDelete.length].replace('.json', '');
        } else {
          this.metadata.oldestSession = undefined;
        }
        this.saveMetadata();
      }
    } catch (error) {
      console.error('Failed to prune old sessions:', error);
    }
  }

  /**
   * Basic implementation of search
   * Note: This is a simple implementation that scans files
   * A proper implementation would use a real search index like Lunr.js
   */
  public search(params: SearchParams): SearchResults {
    const results: SearchResults = {
      entries: [],
      total: 0
    };

    try {
      const sessionIds = this.getSessionIds(
        params.timeRange?.start,
        params.timeRange?.end
      );

      let matchingEntries: Array<{
        sessionId: string;
        entry: AttentionLogEntry;
      }> = [];

      // Scan each matching session file
      for (const sessionId of sessionIds) {
        const session = this.getSession(sessionId);
        if (!session) continue;

        // Filter log entries
        for (const entry of session.logs) {
          let matches = true;

          // Apply filters
          if (params.status && entry.status !== params.status) {
            matches = false;
          }

          if (params.minConfidence !== undefined && entry.confidence < params.minConfidence) {
            matches = false;
          }

          if (params.maxConfidence !== undefined && entry.confidence > params.maxConfidence) {
            matches = false;
          }

          if (params.timeRange && (
            entry.timestamp < params.timeRange.start ||
            entry.timestamp > params.timeRange.end
          )) {
            matches = false;
          }

          // For text search, we could look at metadata or any text fields
          if (params.text && !this.textMatchesEntry(params.text, entry)) {
            matches = false;
          }

          // Check tags if specified in both query and session
          if (params.tags && params.tags.length > 0 && session.config.tags) {
            if (!params.tags.some(tag => session.config.tags?.includes(tag))) {
              matches = false;
            }
          }

          if (matches) {
            matchingEntries.push({
              sessionId,
              entry
            });
          }
        }
      }

      // Apply limit and offset
      results.total = matchingEntries.length;

      if (params.offset !== undefined || params.limit !== undefined) {
        const offset = params.offset || 0;
        const limit = params.limit || matchingEntries.length;
        matchingEntries = matchingEntries.slice(offset, offset + limit);
      }

      results.entries = matchingEntries;
      return results;

    } catch (error) {
      console.error('Search failed:', error);
      return results;
    }
  }

  /**
   * Simple text matching function
   * In a real implementation, this would use the search index
   */
  private textMatchesEntry(text: string, entry: AttentionLogEntry): boolean {
    const searchText = text.toLowerCase();

    // Check status
    if (entry.status.toLowerCase().includes(searchText)) {
      return true;
    }

    // Check metadata if available
    if (entry.metadata) {
      const metadataStr = JSON.stringify(entry.metadata).toLowerCase();
      if (metadataStr.includes(searchText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Basic indexing of a log entry for search
   * This is a placeholder for a more sophisticated search index
   */
  private indexLogEntry(sessionId: string, entry: AttentionLogEntry): void {
    // In a real implementation, this would update a search index
    // For now, we'll just use the file-based approach and scan when needed

    // Future enhancement: implement a proper search index using a library
    // like Lunr.js, FlexSearch, or a lightweight SQLite FTS index
  }

  /**
   * Get storage statistics
   */
  public getStats(): {
    sessionCount: number;
    totalLogEntries: number;
    oldestSession?: string;
    newestSession?: string;
    diskUsage: number;
  } {
    try {
      // Calculate disk usage
      let totalSize = 0;

      // Add sessions size
      const sessionFiles = fs.readdirSync(this.sessionsPath);
      for (const file of sessionFiles) {
        const stats = fs.statSync(path.join(this.sessionsPath, file));
        totalSize += stats.size;
      }

      // Add metadata size
      if (fs.existsSync(this.metadataPath)) {
        const stats = fs.statSync(this.metadataPath);
        totalSize += stats.size;
      }

      return {
        sessionCount: this.metadata.sessionCount,
        totalLogEntries: this.metadata.totalLogEntries,
        oldestSession: this.metadata.oldestSession,
        newestSession: this.metadata.lastSessionId,
        diskUsage: totalSize
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        sessionCount: 0,
        totalLogEntries: 0,
        diskUsage: 0
      };
    }
  }
}
