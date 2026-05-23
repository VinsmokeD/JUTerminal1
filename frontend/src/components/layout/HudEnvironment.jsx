import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSessionStore } from '../../store/sessionStore';

export default function HudEnvironment({ children }) {
  const canvasRef = useRef(null);
  const currentSession = useSessionStore((state) => state.currentSession);
  
  // Determine color theme based on active workspace/role
  // Red Team -> Crimson, Blue Team -> Cyan, Dashboard/Briefing -> Neutral Deep Blue
  const role = currentSession?.role; // 'red' or 'blue'
  const scenarioId = currentSession?.scenario_id;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    
    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 30;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Color selection based on role/theme
    let particleColor = 0x1e3a8a; // Default neutral deep blue
    if (role === 'red') {
      particleColor = 0xff003c; // Crimson
    } else if (role === 'blue') {
      particleColor = 0x00f0ff; // Cyan
    } else if (scenarioId) {
      // Fallback color for scenario active but role not set
      particleColor = scenarioId.includes('03') ? 0x00f0ff : 0xff3b3b;
    }

    // 5. Create Particle Grid
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialY = new Float32Array(particleCount);
    const speed = new Float32Array(particleCount);
    const amplitude = new Float32Array(particleCount);

    const rangeX = 80;
    const rangeY = 40;
    const rangeZ = 50;

    for (let i = 0; i < particleCount; i++) {
      // Distribute particles in a 3D box
      const x = (Math.random() - 0.5) * rangeX;
      const y = (Math.random() - 0.5) * rangeY;
      const z = (Math.random() - 0.5) * rangeZ;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialY[i] = y;
      speed[i] = 0.2 + Math.random() * 0.5;
      amplitude[i] = 0.5 + Math.random() * 2.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Simple round particle texture using canvas
    const createCircleTexture = () => {
      const size = 16;
      const canvasTex = document.createElement('canvas');
      canvasTex.width = size;
      canvasTex.height = size;
      const ctx = canvasTex.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }
      return new THREE.CanvasTexture(canvasTex);
    };

    const material = new THREE.PointsMaterial({
      size: 0.18,
      color: particleColor,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: createCircleTexture(),
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 6. Grid Helper (Subtle tech lines on the floor/ceiling)
    const gridColor = role === 'red' ? 0xff003c : role === 'blue' ? 0x00f0ff : 0x1e3b8a;
    const gridHelperBottom = new THREE.GridHelper(100, 40, gridColor, gridColor);
    gridHelperBottom.position.y = -18;
    gridHelperBottom.material.opacity = 0.04;
    gridHelperBottom.material.transparent = true;
    scene.add(gridHelperBottom);

    const gridHelperTop = new THREE.GridHelper(100, 40, gridColor, gridColor);
    gridHelperTop.position.y = 18;
    gridHelperTop.material.opacity = 0.02;
    gridHelperTop.material.transparent = true;
    scene.add(gridHelperTop);

    // 7. Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      // Normalize mouse coordinates from -1 to 1
      targetX = (event.clientX - window.innerWidth / 2) * 0.02;
      targetY = (event.clientY - window.innerHeight / 2) * 0.02;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 8. Handle Window Resize
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const posArray = geometry.attributes.position.array;

      // Update particle positions (sinusoidal drift)
      for (let i = 0; i < particleCount; i++) {
        const yIdx = i * 3 + 1;
        const xIdx = i * 3;
        
        // Gentle wave motion
        posArray[yIdx] = initialY[i] + Math.sin(elapsedTime * speed[i] + posArray[xIdx]) * amplitude[i] * 0.3;
      }
      geometry.attributes.position.needsUpdate = true;

      // Slow rotation
      particles.rotation.y = elapsedTime * 0.02;

      // Smooth camera lerp based on mouse position
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      camera.position.x = mouseX;
      camera.position.y = -mouseY;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [role, scenarioId]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-50 bg-[#030508] pointer-events-none"
        style={{ display: 'block' }}
      />
      <div className="relative z-10 w-full h-full min-h-screen">
        {children}
      </div>
    </>
  );
}
