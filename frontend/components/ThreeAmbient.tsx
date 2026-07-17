"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useState, useRef } from "react";

function ParticleCloud(props: any) {
  const ref = useRef<any>();
  // Natively generate random points in a sphere to prevent maath ESM load failures
  const [sphere] = useState(() => {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.5 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const val = 2 * Math.random() - 1;
      const phi = Math.acos(Math.max(-1, Math.min(1, val)));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta); // x
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta); // y
      positions[i * 3 + 2] = r * Math.cos(phi); // z
    }
    return positions;
  });

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <points ref={ref} {...props}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={1000}
            array={sphere}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#3ED9C4"
          size={0.005}
          transparent={true}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </points>
    </group>
  );
}

export default function ThreeAmbient() {
  return (
    <div className="absolute inset-0 -z-10 bg-ink overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <ParticleCloud />
      </Canvas>
      {/* Gradient overlay to fade it out at the edges */}
      <div className="absolute inset-0 bg-radial-fade" />
    </div>
  );
}
