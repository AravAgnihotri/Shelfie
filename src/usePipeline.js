/**
 * React Hook for Pipeline Processing
 * 
 * Manages the state and execution of the image processing pipeline
 * with detailed progress tracking and error handling.
 * 
 * Usage:
 *   const pipeline = usePipeline();
 *   
 *   // Trigger processing
 *   await pipeline.process(imageFile);
 *   
 *   // Access state
 *   console.log(pipeline.stage); // 'extracting-keypoints' | 'fitting-smpl' | ...
 *   console.log(pipeline.progress); // 0-100
 * 
 * Returns:
 * - loading: boolean indicating if processing is in progress
 * - stage: current pipeline stage
 * - progress: progress percentage (0-100)
 * - keypoints: extracted keypoints array
 * - smpl: SMPL parameters object
 * - mesh: THREE.js mesh object
 * - metadata: pipeline metadata
 * - error: error object if processing failed
 * - process: function to trigger pipeline with an image file
 * - reset: function to reset all state
 */

import { useState, useCallback } from 'react';
import { processImage } from './pipeline/pipeline.js';

/**
 * Pipeline stages
 */
export const PipelineStages = {
  IDLE: 'idle',
  EXTRACTING_KEYPOINTS: 'extracting-keypoints',
  FITTING_SMPL: 'fitting-smpl',
  BUILDING_MESH: 'building-mesh',
  COMPLETE: 'complete',
  ERROR: 'error'
};

export function usePipeline() {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(PipelineStages.IDLE);
  const [progress, setProgress] = useState(0);
  const [keypoints, setKeypoints] = useState(null);
  const [smpl, setSmpl] = useState(null);
  const [mesh, setMesh] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Progress callback handler
   */
  const handleProgress = useCallback((currentStage, currentProgress, data) => {
    setStage(currentStage);
    setProgress(currentProgress);
    
    // Update intermediate results as they become available
    if (data.keypoints) setKeypoints(data.keypoints);
    if (data.smpl) setSmpl(data.smpl);
    if (data.mesh) setMesh(data.mesh);
  }, []);

  /**
   * Main process function
   */
  const process = useCallback(async (file) => {
    if (!file) {
      setError(new Error('No file provided'));
      setStage(PipelineStages.ERROR);
      return;
    }

    // Reset state
    setLoading(true);
    setError(null);
    setStage(PipelineStages.EXTRACTING_KEYPOINTS);
    setProgress(0);
    setKeypoints(null);
    setSmpl(null);
    setMesh(null);
    setMetadata(null);
    
    try {
      const result = await processImage(file, handleProgress);
      
      // Set final results
      setKeypoints(result.keypoints);
      setSmpl(result.smpl);
      setMesh(result.mesh);
      setMetadata(result.metadata);
      setStage(PipelineStages.COMPLETE);
      setProgress(100);
      
      return result;
      
    } catch (err) {
      console.error('Pipeline processing failed:', err);
      setError(err);
      setStage(PipelineStages.ERROR);
      setProgress(0);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleProgress]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setStage(PipelineStages.IDLE);
    setProgress(0);
    setKeypoints(null);
    setSmpl(null);
    setMesh(null);
    setMetadata(null);
    setError(null);
  }, []);

  /**
   * Get human-readable stage name
   */
  const getStageName = useCallback(() => {
    const stageNames = {
      [PipelineStages.IDLE]: 'Ready',
      [PipelineStages.EXTRACTING_KEYPOINTS]: 'Extracting Keypoints',
      [PipelineStages.FITTING_SMPL]: 'Fitting SMPL Parameters',
      [PipelineStages.BUILDING_MESH]: 'Building 3D Mesh',
      [PipelineStages.COMPLETE]: 'Complete',
      [PipelineStages.ERROR]: 'Error'
    };
    return stageNames[stage] || stage;
  }, [stage]);

  return {
    // State
    loading,
    stage,
    progress,
    keypoints,
    smpl,
    mesh,
    metadata,
    error,
    
    // Functions
    process,
    reset,
    getStageName,
    
    // Computed
    isIdle: stage === PipelineStages.IDLE,
    isProcessing: loading,
    isComplete: stage === PipelineStages.COMPLETE,
    hasError: stage === PipelineStages.ERROR
  };
}
