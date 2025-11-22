/**
 * Debug Page
 * 
 * Developer tools for inspecting pipeline internals:
 * - Raw keypoints visualization
 * - SMPL parameters display
 * - Mesh object properties
 * - Individual pipeline step execution
 * - Performance metrics
 */

import { useState } from 'react';
import { usePipeline } from './usePipeline';
import ModelViewer from './ModelViewer';
import { extractKeypoints } from './pipeline/keypoints.js';
import { fitSMPL } from './pipeline/smplFit.js';
import { buildMesh } from './pipeline/meshBuilder.js';
import { getPipelineLogs, clearPipelineLogs } from './pipeline/pipeline.js';

export default function Debug() {
  const pipeline = usePipeline();
  const [individualKeypoints, setIndividualKeypoints] = useState(null);
  const [individualSmpl, setIndividualSmpl] = useState(null);
  const [individualMesh, setIndividualMesh] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const runFullPipeline = async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }
    await pipeline.process(selectedFile);
    updateLogs();
  };

  const runKeypointsOnly = async () => {
    try {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const kpts = await extractKeypoints(mockFile);
      setIndividualKeypoints(kpts);
      updateLogs();
    } catch (error) {
      console.error('Keypoint extraction failed:', error);
    }
  };

  const runSMPLOnly = async () => {
    try {
      const mockKeypoints = individualKeypoints || pipeline.keypoints;
      if (!mockKeypoints) {
        alert('Run keypoint extraction first');
        return;
      }
      const smplParams = await fitSMPL(mockKeypoints);
      setIndividualSmpl(smplParams);
      updateLogs();
    } catch (error) {
      console.error('SMPL fitting failed:', error);
    }
  };

  const runMeshOnly = async () => {
    try {
      const smplParams = individualSmpl || pipeline.smpl;
      if (!smplParams) {
        alert('Run SMPL fitting first');
        return;
      }
      const mesh = await buildMesh(smplParams);
      setIndividualMesh(mesh);
      updateLogs();
    } catch (error) {
      console.error('Mesh building failed:', error);
    }
  };

  const updateLogs = () => {
    const pipelineLogs = getPipelineLogs();
    setLogs(pipelineLogs.slice(-20)); // Last 20 logs
  };

  const handleClearLogs = () => {
    clearPipelineLogs();
    setLogs([]);
  };

  const currentKeypoints = individualKeypoints || pipeline.keypoints;
  const currentSmpl = individualSmpl || pipeline.smpl;
  const currentMesh = individualMesh || pipeline.mesh;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🔧 Pipeline Debug Console</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Pipeline Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div>
            <strong>Stage:</strong> {pipeline.getStageName()}
          </div>
          <div>
            <strong>Progress:</strong> {pipeline.progress}%
          </div>
          <div>
            <strong>Loading:</strong> {pipeline.loading ? '🔄 Yes' : '✓ No'}
          </div>
        </div>
        {pipeline.metadata && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Session: {pipeline.metadata.sessionId} | 
            Duration: {pipeline.metadata.duration?.toFixed(2)}ms | 
            Mode: {pipeline.metadata.mode}
          </div>
        )}
      </div>

      {/* File Upload and Pipeline Controls */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h3>Full Pipeline Test</h3>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileSelect}
          style={{ marginRight: '10px' }}
        />
        <button 
          onClick={runFullPipeline}
          disabled={pipeline.loading || !selectedFile}
          style={{
            padding: '10px 20px',
            backgroundColor: pipeline.loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: pipeline.loading ? 'not-allowed' : 'pointer'
          }}
        >
          {pipeline.loading ? 'Processing...' : 'Run Full Pipeline'}
        </button>
        <button 
          onClick={pipeline.reset}
          style={{
            padding: '10px 20px',
            marginLeft: '10px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Individual Step Controls */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#fff3e0', borderRadius: '8px' }}>
        <h3>Individual Steps (Mock Data)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={runKeypointsOnly} style={buttonStyle}>
            1. Extract Keypoints
          </button>
          <button onClick={runSMPLOnly} style={buttonStyle}>
            2. Fit SMPL
          </button>
          <button onClick={runMeshOnly} style={buttonStyle}>
            3. Build Mesh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Data Display */}
        <div>
          {/* Keypoints */}
          <div style={{ marginBottom: '20px', padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Keypoints ({currentKeypoints?.length || 0})</h3>
            {currentKeypoints ? (
              <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                {currentKeypoints.slice(0, 10).map((kp, i) => (
                  <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #eee' }}>
                    {i}: {kp.name || 'joint'} - 
                    x: {kp.x.toFixed(3)}, 
                    y: {kp.y.toFixed(3)}, 
                    conf: {kp.confidence.toFixed(3)}
                  </div>
                ))}
                {currentKeypoints.length > 10 && (
                  <div style={{ padding: '5px', color: '#666' }}>
                    ... and {currentKeypoints.length - 10} more
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#999' }}>No keypoints data</p>
            )}
          </div>

          {/* SMPL Parameters */}
          <div style={{ marginBottom: '20px', padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>SMPL Parameters</h3>
            {currentSmpl ? (
              <div style={{ fontSize: '12px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Betas (Shape):</strong> [{currentSmpl.betas.length}]
                  <div style={{ maxHeight: '80px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px', background: '#f5f5f5', padding: '5px', marginTop: '5px' }}>
                    {currentSmpl.betas.map((b, i) => `β${i}:${b.toFixed(3)}`).join(', ')}
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Thetas (Pose):</strong> [{currentSmpl.thetas.length}] = {currentSmpl.thetas.length / 3} joints
                  <div style={{ maxHeight: '80px', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px', background: '#f5f5f5', padding: '5px', marginTop: '5px' }}>
                    {Array.from({ length: Math.min(8, currentSmpl.thetas.length / 3) }, (_, i) => {
                      const start = i * 3;
                      return `J${i}:[${currentSmpl.thetas.slice(start, start + 3).map(t => t.toFixed(2)).join(',')}]`;
                    }).join(' ')}
                    {currentSmpl.thetas.length > 24 && ' ...'}
                  </div>
                </div>
                {currentSmpl.avgConfidence && (
                  <div><strong>Avg Confidence:</strong> {currentSmpl.avgConfidence.toFixed(3)}</div>
                )}
                {currentSmpl.method && (
                  <div><strong>Method:</strong> {currentSmpl.method}</div>
                )}
              </div>
            ) : (
              <p style={{ color: '#999' }}>No SMPL data</p>
            )}
          </div>

          {/* Mesh Properties */}
          <div style={{ padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Mesh Object</h3>
            {currentMesh ? (
              <div style={{ fontSize: '12px' }}>
                <div><strong>Type:</strong> {currentMesh.type}</div>
                {currentMesh.children && (
                  <div><strong>Children:</strong> {currentMesh.children.length}</div>
                )}
                {currentMesh.geometry && (
                  <>
                    <div><strong>Geometry:</strong> {currentMesh.geometry.type}</div>
                    {currentMesh.geometry.attributes?.position && (
                      <div><strong>Vertices:</strong> {currentMesh.geometry.attributes.position.count}</div>
                    )}
                  </>
                )}
                {currentMesh.material && (
                  <div><strong>Material:</strong> {currentMesh.material.type}</div>
                )}
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                  <strong>Object Structure:</strong>
                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', maxHeight: '120px', overflow: 'auto' }}>
                    {JSON.stringify({
                      type: currentMesh.type,
                      children: currentMesh.children?.length || 0,
                      hasGeometry: !!currentMesh.geometry,
                      hasMaterial: !!currentMesh.material
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p style={{ color: '#999' }}>No mesh data</p>
            )}
          </div>
        </div>

        {/* Right Column: 3D View and Logs */}
        <div>
          {/* 3D Viewer */}
          <div style={{ marginBottom: '20px' }}>
            <h3>3D Mesh Preview</h3>
            <ModelViewer mesh={currentMesh} />
          </div>

          {/* Logs */}
          <div style={{ padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Pipeline Logs</h3>
              <div>
                <button onClick={updateLogs} style={{ ...buttonStyle, padding: '5px 10px', fontSize: '12px', marginRight: '5px' }}>
                  Refresh
                </button>
                <button onClick={handleClearLogs} style={{ ...buttonStyle, padding: '5px 10px', fontSize: '12px', backgroundColor: '#f44336' }}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ maxHeight: '300px', overflow: 'auto', fontSize: '11px', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', padding: '10px', borderRadius: '4px' }}>
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i} style={{ 
                    padding: '2px 0',
                    color: log.level === 'ERROR' ? '#f44336' : 
                           log.level === 'WARN' ? '#ff9800' :
                           log.level === 'DEBUG' ? '#9e9e9e' : '#4CAF50'
                  }}>
                    [{log.stage}] {log.message} +{log.timestamp.toFixed(0)}ms
                  </div>
                ))
              ) : (
                <div style={{ color: '#666' }}>No logs yet. Run the pipeline to see logs.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {pipeline.error && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#ffebee', border: '1px solid #f44336', borderRadius: '8px' }}>
          <h3 style={{ color: '#f44336' }}>Error</h3>
          <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
            {pipeline.error.message}
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: '8px 16px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px'
};
