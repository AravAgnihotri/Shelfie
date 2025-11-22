/**
 * Pipeline Logger
 * 
 * Structured logging system for the Image → SMPL → Mesh pipeline.
 * Tracks stages, timing, errors, and debug information.
 */

import { pipelineConfig } from './pipelineConfig.js';

/**
 * Pipeline stages
 */
export const PipelineStage = {
  START: 'START',
  PREPROCESSING: 'PREPROCESSING',
  KEYPOINTS: 'KEYPOINTS',
  SMPL: 'SMPL',
  MESH: 'MESH',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
};

/**
 * Log levels
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class PipelineLogger {
  constructor() {
    this.sessionId = null;
    this.startTime = null;
    this.stageTimes = new Map();
    this.currentStage = null;
    this.logs = [];
  }

  /**
   * Start a new pipeline session
   */
  startSession(sessionId) {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.startTime = performance.now();
    this.stageTimes.clear();
    this.currentStage = null;
    this.logs = [];
    
    this.info(PipelineStage.START, `Pipeline session started: ${this.sessionId}`);
  }

  /**
   * Start tracking a stage
   */
  startStage(stage) {
    this.currentStage = stage;
    this.stageTimes.set(stage, { start: performance.now() });
    this.info(stage, `Stage started: ${stage}`);
  }

  /**
   * End tracking a stage
   */
  endStage(stage, data = {}) {
    const stageTime = this.stageTimes.get(stage);
    if (stageTime) {
      stageTime.end = performance.now();
      stageTime.duration = stageTime.end - stageTime.start;
      
      if (pipelineConfig.logging.logTiming) {
        this.info(stage, `Stage completed in ${stageTime.duration.toFixed(2)}ms`, data);
      }
    }
  }

  /**
   * Get current log level threshold
   */
  getLogLevelThreshold() {
    const level = pipelineConfig.logging.level;
    return LogLevel[level.toUpperCase()] ?? LogLevel.INFO;
  }

  /**
   * Check if should log at this level
   */
  shouldLog(level) {
    return level >= this.getLogLevelThreshold();
  }

  /**
   * Internal log method
   */
  _log(level, levelName, stage, message, data = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: performance.now() - (this.startTime || 0),
      session: this.sessionId,
      level: levelName,
      stage,
      message,
      data
    };

    this.logs.push(logEntry);

    if (pipelineConfig.logging.logToConsole) {
      const prefix = `[Pipeline:${stage}]`;
      const timeStr = `+${logEntry.timestamp.toFixed(0)}ms`;
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, timeStr, data);
          break;
        case LogLevel.INFO:
          console.log(prefix, message, timeStr, data);
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, timeStr, data);
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, timeStr, data);
          break;
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(stage, message, data) {
    this._log(LogLevel.DEBUG, 'DEBUG', stage, message, data);
  }

  /**
   * Info level logging
   */
  info(stage, message, data) {
    this._log(LogLevel.INFO, 'INFO', stage, message, data);
  }

  /**
   * Warning level logging
   */
  warn(stage, message, data) {
    this._log(LogLevel.WARN, 'WARN', stage, message, data);
  }

  /**
   * Error level logging
   */
  error(stage, message, error) {
    const errorData = {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    };
    this._log(LogLevel.ERROR, 'ERROR', stage, message, errorData);
  }

  /**
   * Get timing summary for all stages
   */
  getTimingSummary() {
    const summary = {};
    for (const [stage, time] of this.stageTimes.entries()) {
      summary[stage] = {
        duration: time.duration || 0,
        percentage: time.duration ? (time.duration / (performance.now() - this.startTime) * 100).toFixed(1) : 0
      };
    }
    return summary;
  }

  /**
   * Get total pipeline duration
   */
  getTotalDuration() {
    if (!this.startTime) return 0;
    return performance.now() - this.startTime;
  }

  /**
   * Get all logs for this session
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.stageTimes.clear();
  }
}

// Global logger instance
export const logger = new PipelineLogger();
