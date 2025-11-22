/**
 * Pipeline Configuration
 * 
 * Central configuration for the Image → SMPL → Mesh pipeline.
 * Controls inference modes, model paths, optimization settings, and logging.
 */

export const pipelineConfig = {
  /**
   * Inference Mode
   * - 'mock': Use mock data (fast, for development)
   * - 'real': Use real ML models (requires model files and GPU)
   */
  inferenceMode: 'real',

  /**
   * Model Paths
   * These will point to actual model files when using real inference
   */
  models: {
    // Pose estimation model (OpenPose, MediaPipe, or HRNet)
    poseEstimation: {
      type: 'mediapipe', // 'openpose' | 'mediapipe' | 'hrnet'
      path: '/models/pose/mediapipe_pose_landmarker.task',
      enabled: true
    },

    // SMPL parameter regression model
    smplRegressor: {
      type: 'hmr2', // 'hmr2' | 'spin' | 'expose'
      path: '/models/smpl/hmr2_weights.ckpt',
      enabled: false
    },

    // SMPL body model files
    smplModel: {
      type: 'smpl', // 'smpl' | 'smpl-x' | 'smpl-h'
      path: '/models/smpl/SMPL_NEUTRAL.pkl',
      enabled: false
    }
  },

  /**
   * Hardware Configuration
   */
  hardware: {
    // GPU acceleration (WebGL, WebGPU, or server-side)
    useGPU: false,
    
    // Preferred backend for ML inference
    backend: 'webgl', // 'webgl' | 'webgpu' | 'cpu' | 'wasm'
    
    // Maximum texture size for WebGL
    maxTextureSize: 2048
  },

  /**
   * Processing Options
   */
  processing: {
    // Input image max resolution (for preprocessing)
    maxImageSize: 512,
    
    // Number of keypoints to extract
    numKeypoints: 17, // COCO format
    
    // Confidence threshold for keypoint detection
    keypointConfidenceThreshold: 0.5,
    
    // SMPL optimization iterations (when using SMPLify)
    smplOptimizationSteps: 100,
    
    // Use temporal smoothing for video sequences
    temporalSmoothing: false
  },

  /**
   * Logging Configuration
   */
  logging: {
    // Log level: 'debug' | 'info' | 'warn' | 'error' | 'none'
    level: 'debug',
    
    // Log to console
    logToConsole: true,
    
    // Log timing information for each stage
    logTiming: true,
    
    // Log detailed model outputs
    logModelOutputs: true
  },

  /**
   * Development Options
   */
  development: {
    // Show debug visualizations
    showDebugVisuals: true,
    
    // Cache intermediate results
    cacheResults: false,
    
    // Simulate processing delays (ms)
    mockDelay: {
      keypoints: 300,
      smpl: 500,
      mesh: 200
    }
  }
};

/**
 * Helper function to check if using real models
 */
export function isRealInference() {
  return pipelineConfig.inferenceMode === 'real';
}

/**
 * Helper function to get current log level
 */
export function getLogLevel() {
  return pipelineConfig.logging.level;
}

/**
 * Helper function to get mock delay for a stage
 */
export function getMockDelay(stage) {
  return pipelineConfig.development.mockDelay[stage] || 0;
}
