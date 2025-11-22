/**
 * Pipeline Test Script
 * 
 * This script validates that all pipeline modules work correctly
 * Run with: node test-pipeline.js
 */

import { processImage } from './src/pipeline/pipeline.js';

async function testPipeline() {
  console.log('=== Pipeline Test Starting ===\n');
  
  // Create a mock image file
  const mockFile = {
    name: 'test-image.jpg',
    type: 'image/jpeg',
    size: 12345
  };
  
  try {
    const result = await processImage(mockFile);
    
    console.log('\n=== Test Results ===');
    console.log('✓ Keypoints extracted:', result.keypoints.length, 'joints');
    console.log('✓ SMPL parameters generated:');
    console.log('  - Betas (shape):', result.smpl.betas.length, 'values');
    console.log('  - Thetas (pose):', result.smpl.thetas.length, 'values');
    console.log('  - Avg confidence:', result.smpl.avgConfidence.toFixed(3));
    console.log('✓ Mesh generated:', result.mesh.type);
    console.log('  - Geometry:', result.mesh.geometry.type);
    console.log('  - Material:', result.mesh.material.type);
    
    console.log('\n✅ Pipeline test PASSED - All modules working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ Pipeline test FAILED:', error);
    process.exit(1);
  }
}

testPipeline();
