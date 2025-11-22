/**
 * React Hook for Pipeline Processing
 * 
 * Manages the state and execution of the image processing pipeline
 * 
 * Usage:
 *   const { loading, keypoints, smpl, mesh, error, process } = usePipeline();
 *   
 *   // Trigger processing
 *   await process(imageFile);
 * 
 * Returns:
 * - loading: boolean indicating if processing is in progress
 * - keypoints: extracted keypoints array
 * - smpl: SMPL parameters object
 * - mesh: THREE.js mesh object
 * - error: error object if processing failed
 * - process: function to trigger pipeline with an image file
 */

import { useState, useCallback } from 'react';
import { processImage } from './pipeline/pipeline.js';

export function usePipeline() {
  const [loading, setLoading] = useState(false);
  const [keypoints, setKeypoints] = useState(null);
  const [smpl, setSmpl] = useState(null);
  const [mesh, setMesh] = useState(null);
  const [error, setError] = useState(null);

  const process = useCallback(async (file) => {
    if (!file) {
      setError(new Error('No file provided'));
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await processImage(file);
      
      setKeypoints(result.keypoints);
      setSmpl(result.smpl);
      setMesh(result.mesh);
      
    } catch (err) {
      console.error('Pipeline processing failed:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    keypoints,
    smpl,
    mesh,
    error,
    process
  };
}
