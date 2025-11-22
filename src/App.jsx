import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import ModelViewer from './ModelViewer';
import Debug from './Debug';
import { usePipeline } from './usePipeline';

function Home() {
  const { loading, mesh, error, process, stage, progress, getStageName } = usePipeline();
  const [testMessage, setTestMessage] = useState('');

  const runPipelineTest = async () => {
    setTestMessage('Running pipeline...');
    
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    try {
      await process(mockFile);
      setTestMessage('Pipeline complete! Check console for details.');
    } catch (err) {
      setTestMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f7f7f7' }}>
      <h1 style={{ textAlign: 'center', padding: '20px', margin: 0 }}>
        Image → 3D Model Pipeline
      </h1>

      <div style={{ textAlign: 'center', padding: '10px' }}>
        <button 
          onClick={runPipelineTest}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? `${getStageName()}... ${progress}%` : 'Test Pipeline'}
        </button>
        
        <Link to="/debug" style={{ marginLeft: '10px' }}>
          <button style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            🔧 Debug Console
          </button>
        </Link>
        
        {testMessage && (
          <p style={{ marginTop: '10px', color: error ? 'red' : 'green' }}>
            {testMessage}
          </p>
        )}
        
        {error && (
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        )}

        {loading && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Stage: {getStageName()}
            </div>
            <div style={{ width: '300px', height: '8px', background: '#e0e0e0', borderRadius: '4px', margin: '10px auto', overflow: 'hidden' }}>
              <div style={{ 
                width: `${progress}%`, 
                height: '100%', 
                background: '#4CAF50', 
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}
      </div>

      <ModelViewer mesh={mesh} />
      
      <div style={{ padding: '20px', fontSize: '12px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
        <strong>Pipeline Status:</strong>
        <ul style={{ textAlign: 'left' }}>
          <li>✓ Keypoints extraction module ready</li>
          <li>✓ SMPL fitting module ready</li>
          <li>✓ Mesh builder module ready (procedural humanoid)</li>
          <li>✓ Pipeline orchestrator ready</li>
          <li>✓ React hook integrated with progress tracking</li>
          <li>✓ Logger and config system active</li>
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/debug" element={<Debug />} />
      </Routes>
    </BrowserRouter>
  );
}
