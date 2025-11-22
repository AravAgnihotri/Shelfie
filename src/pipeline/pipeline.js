/**
 * Main Pipeline Orchestrator
 * 
 * Executes the full Image → Keypoints → SMPL → Mesh pipeline
 * 
 * Pipeline stages:
 * 1. Keypoint extraction from image
 * 2. SMPL parameter fitting from keypoints
 * 3. 3D mesh generation from SMPL parameters
 * 
 * This architecture allows for:
 * - Easy replacement of individual modules
 * - Caching intermediate results
 * - Error handling at each stage
 * - Progress tracking and logging
 * - Mock vs real inference switching
 */

import { extractKeypoints, validateKeypoints } from './keypoints.js';
import { fitSMPL, validateSMPLParams } from './smplFit.js';
import { buildMesh } from './meshBuilder.js';
import { logger, PipelineStage } from './logger.js';
import { pipelineConfig } from './pipelineConfig.js';

/**
 * Progress callback type
 * @callback ProgressCallback
 * @param {string} stage - Current pipeline stage
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} data - Stage-specific data
 */

/**
 * Process image through the full pipeline
 * 
 * @param {File|HTMLImageElement} imageFile - Input image
 * @param {ProgressCallback} onProgress - Optional progress callback
 * @returns {Promise<Object>} Pipeline results {keypoints, smpl, mesh}
 */
export async function processImage(imageFile, onProgress = null) {
  // Start new pipeline session
  const sessionId = `pipeline_${Date.now()}`;
  logger.startSession(sessionId);
  
  logger.info(PipelineStage.START, 'Starting pipeline processing', {
    fileName: imageFile?.name || 'unknown',
    fileType: imageFile?.type || 'unknown',
    fileSize: imageFile?.size || 0,
    mode: pipelineConfig.inferenceMode
  });
  
  try {
    // ============================================================
    // STAGE 1: Extract 2D/3D keypoints from image
    // ============================================================
    
    if (onProgress) onProgress('extracting-keypoints', 0, {});
    
    logger.info(PipelineStage.KEYPOINTS, 'Starting keypoint extraction');
    const keypoints = await extractKeypoints(imageFile);
    
    // Validate keypoints
    if (!validateKeypoints(keypoints)) {
      logger.warn(PipelineStage.KEYPOINTS, 'Keypoint validation failed - some essential keypoints missing');
    }
    
    if (onProgress) onProgress('extracting-keypoints', 33, { keypoints });
    
    // ============================================================
    // STAGE 2: Fit SMPL model to keypoints
    // ============================================================
    
    if (onProgress) onProgress('fitting-smpl', 33, { keypoints });
    
    logger.info(PipelineStage.SMPL, 'Starting SMPL fitting');
    const smpl = await fitSMPL(keypoints);
    
    // Validate SMPL parameters
    if (!validateSMPLParams(smpl)) {
      logger.warn(PipelineStage.SMPL, 'SMPL parameters may be out of reasonable range');
    }
    
    if (onProgress) onProgress('fitting-smpl', 66, { keypoints, smpl });
    
    // ============================================================
    // STAGE 3: Generate 3D mesh from SMPL parameters
    // ============================================================
    
    if (onProgress) onProgress('building-mesh', 66, { keypoints, smpl });
    
    logger.info(PipelineStage.MESH, 'Starting mesh generation');
    const mesh = await buildMesh(smpl);
    
    if (onProgress) onProgress('building-mesh', 100, { keypoints, smpl, mesh });
    
    // ============================================================
    // COMPLETE
    // ============================================================
    
    logger.info(PipelineStage.COMPLETE, 'Pipeline completed successfully');
    
    if (pipelineConfig.logging.logTiming) {
      const timingSummary = logger.getTimingSummary();
      const totalDuration = logger.getTotalDuration();
      
      logger.info(PipelineStage.COMPLETE, 'Performance summary', {
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        stages: timingSummary
      });
    }
    
    if (onProgress) onProgress('complete', 100, { keypoints, smpl, mesh });
    
    // Return all intermediate and final results
    return {
      keypoints,
      smpl,
      mesh,
      metadata: {
        sessionId,
        duration: logger.getTotalDuration(),
        mode: pipelineConfig.inferenceMode
      }
    };
    
  } catch (error) {
    logger.error(PipelineStage.ERROR, 'Pipeline processing failed', error);
    
    if (onProgress) onProgress('error', 0, { error });
    
    throw error;
  }
}

/**
 * Process a batch of images
 * 
 * @param {Array<File>} imageFiles - Array of input images
 * @param {ProgressCallback} onProgress - Optional progress callback
 * @returns {Promise<Array>} Array of pipeline results
 */
export async function processBatch(imageFiles, onProgress = null) {
  logger.info(PipelineStage.START, `Starting batch processing of ${imageFiles.length} images`);
  
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    
    if (onProgress) {
      onProgress('batch-progress', (i / imageFiles.length) * 100, {
        current: i + 1,
        total: imageFiles.length
      });
    }
    
    try {
      const result = await processImage(file);
      results.push({ success: true, data: result });
    } catch (error) {
      logger.error(PipelineStage.ERROR, `Failed to process image ${i + 1}`, error);
      results.push({ success: false, error: error.message });
    }
  }
  
  logger.info(PipelineStage.COMPLETE, `Batch processing completed`, {
    total: imageFiles.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  });
  
  return results;
}

/**
 * Get pipeline logs for debugging
 */
export function getPipelineLogs() {
  return logger.getLogs();
}

/**
 * Clear pipeline logs
 */
export function clearPipelineLogs() {
  logger.clear();
}
