import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows } from '@react-three/drei';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Mesh } from 'three';

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

function AnimatedMesh({ obj }: { obj: WorldObject }) {
  const meshRef = useRef<Mesh>(null);
  const isPlanet = obj.creator === 'World' || obj.id === 'planet-0';

  useGSAP(() => {
    if (meshRef.current && !isPlanet) {
      // Pop-in animation for agent-built objects
      gsap.fromTo(meshRef.current.scale, 
        { x: 0, y: 0, z: 0 }, 
        { x: obj.scale[0], y: obj.scale[1], z: obj.scale[2], duration: 1, ease: "elastic.out(1, 0.5)" }
      );
      // Slight drop-in
      gsap.fromTo(meshRef.current.position,
        { y: obj.position[1] + 5 },
        { y: obj.position[1], duration: 1, ease: "bounce.out" }
      );
    }
  }, [obj.id, isPlanet]);

  return (
    <mesh ref={meshRef} position={obj.position} scale={isPlanet ? obj.scale : undefined} castShadow receiveShadow>
      {obj.type === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {obj.type === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
      {obj.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
      <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

export function World3D({ objects }: WorldProps) {
  return (
    <Canvas 
      camera={{ position: [15, 15, 15], fov: 45 }} 
      shadows
    >
      <color attach="background" args={['#020617']} />
      <Sky sunPosition={[100, 20, 100]} turbidity={0.08} rayleigh={0.35} />
      <Stars radius={100} depth={50} count={4200} factor={3.5} saturation={0.15} fade speed={0.65} />
      
      <ambientLight intensity={0.28} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.65} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Ground plane tuned to the dashboard palette */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#020617" roughness={0.78} metalness={0.12} />
      </mesh>
      <gridHelper args={[100, 100, '#164E63', '#0F172A']} position={[0, 0, 0]} />

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={50} blur={2} far={10} />

      {/* Render Agent Objects */}
      {objects.map((obj) => (
        <AnimatedMesh key={obj.id} obj={obj} />
      ))}

      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
