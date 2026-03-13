"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── Particle field ── */
function ParticleField({ count = 300 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      [0.96, 0.62, 0.04],
      [0.98, 0.45, 0.09],
      [0.23, 0.51, 0.96],
      [0.66, 0.33, 0.97],
      [0.08, 0.72, 0.65],
      [0.94, 0.27, 0.27],
      [0.93, 0.29, 0.6],
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Collision spark particles ── */
function CollisionSparks() {
  const ref = useRef<THREE.Points>(null);
  const sparkCount = 50;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    for (let i = 0; i < sparkCount; i++) {
      posArr[i * 3] += Math.sin(time * 2 + i) * 0.005;
      posArr[i * 3 + 1] += Math.cos(time * 3 + i * 0.5) * 0.005;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Mouse-following light ── */
function MouseLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!lightRef.current) return;
    lightRef.current.position.x = (state.pointer.x * viewport.width) / 2;
    lightRef.current.position.y = (state.pointer.y * viewport.height) / 2;
  });

  return <pointLight ref={lightRef} intensity={2} distance={8} color="#a78bfa" />;
}

/* ── Main 3D Scene ── */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#a78bfa" />
      <directionalLight position={[-5, -5, 5]} intensity={0.2} color="#f472b6" />
      <MouseLight />

      <ParticleField count={300} />
      <CollisionSparks />
    </>
  );
}

export default function Hero3DScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
