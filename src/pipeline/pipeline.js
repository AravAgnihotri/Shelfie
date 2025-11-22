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
 * - Progress tracking
 */

import { extractKeypoints } from './keypoints.js';
import { fitSMPL } from './smplFit.js';
import { buildMesh } from './meshBuilder.js';

export async function processImage(imageFile) {
  console.log('[Pipeline] Starting processing for image:', imageFile?.name || 'unknown');
  
  try {
    // Stage 1: Extract 2D/3D keypoints from image
    console.log('[Pipeline] Stage 1: Extracting keypoints...');
    const keypoints = await extractKeypoints(imageFile);
    
    // Stage 2: Fit SMPL model to keypoints
    console.log('[Pipeline] Stage 2: Fitting SMPL parameters...');
    const smpl = await fitSMPL(keypoints);
    
    // Stage 3: Generate 3D mesh from SMPL parameters
    console.log('[Pipeline] Stage 3: Building mesh...');
    const mesh = await buildMesh(smpl);
    
    console.log('[Pipeline] ✓ Processing complete');
    
    // Return all intermediate and final results
    return {
      keypoints,
      smpl,
      mesh
    };
    
  } catch (error) {
    console.error('[Pipeline] Error during processing:', error);
    throw error;
  }
}
