import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';

interface WorldObject {
  id: string;
  type: string;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
  creator: string;
}

interface WorldProps {
  objects: WorldObject[];
}

export function World3D({ objects }: WorldProps) {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2a4d2e" />
      </mesh>

      {/* Render Agent Objects */}
      {objects.map((obj) => (
        <mesh key={obj.id} position={obj.position} scale={obj.scale} castShadow>
          {obj.type === 'box' && <boxGeometry args={[1, 1, 1]} />}
          {obj.type === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
          {obj.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
          <meshStandardMaterial color={obj.color} />
        </mesh>
      ))}

      <OrbitControls makeDefault />
    </Canvas>
  );
}
