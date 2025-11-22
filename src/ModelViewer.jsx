import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/**
 * ModelViewer Component
 * 
 * Renders a 3D mesh in a THREE.js canvas
 * 
 * Props:
 * - mesh: THREE.js mesh object to render
 *         If not provided, shows a default placeholder
 */
export default function ModelViewer({ mesh }) {
  return (
    <div style={{ width: "100%", height: "400px", background: "#ddd" }}>
      <Canvas>
        <OrbitControls />
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 3, 3]} />
        
        {mesh ? (
          // Render the pipeline-generated mesh
          <primitive object={mesh} />
        ) : (
          // Default placeholder when no mesh is provided
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="hotpink" />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}
