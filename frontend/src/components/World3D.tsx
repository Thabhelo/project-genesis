import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows } from '@react-three/drei';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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
  const meshRef = useRef<any>(null);

  useGSAP(() => {
    if (meshRef.current) {
      // Pop-in animation
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
  }, [obj.id]);

  return (
    <mesh ref={meshRef} position={obj.position} castShadow receiveShadow>
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
      <color attach="background" args={['#050505']} />
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.2} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Ground Plane with cool grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.8} />
      </mesh>
      <gridHelper args={[100, 100, '#222222', '#111111']} position={[0, 0, 0]} />

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={50} blur={2} far={10} />

      {/* Render Agent Objects */}
      {objects.map((obj) => (
        <AnimatedMesh key={obj.id} obj={obj} />
      ))}

      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
