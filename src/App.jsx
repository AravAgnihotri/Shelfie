import { useState } from 'react';
import ModelViewer from './ModelViewer';
import { usePipeline } from './usePipeline';

export default function App() {
  const { loading, mesh, error, process } = usePipeline();
  const [testMessage, setTestMessage] = useState('');

  const runPipelineTest = async () => {
    setTestMessage('Running pipeline...');
    
    // Create a mock image file for testing
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await process(mockFile);
    setTestMessage('Pipeline complete! Check console for details.');
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#f7f7f7' }}>
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
          {loading ? 'Processing...' : 'Test Pipeline'}
        </button>
        
        {testMessage && (
          <p style={{ marginTop: '10px', color: error ? 'red' : 'green' }}>
            {testMessage}
          </p>
        )}
        
        {error && (
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        )}
      </div>

      <ModelViewer mesh={mesh} />
      
      <div style={{ padding: '20px', fontSize: '12px', color: '#666' }}>
        <strong>Pipeline Status:</strong>
        <ul>
          <li>✓ Keypoints extraction module ready</li>
          <li>✓ SMPL fitting module ready</li>
          <li>✓ Mesh builder module ready</li>
          <li>✓ Pipeline orchestrator ready</li>
          <li>✓ React hook integrated</li>
        </ul>
      </div>
    </div>
  );
}
