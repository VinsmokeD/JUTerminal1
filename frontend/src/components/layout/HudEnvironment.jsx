import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSessionStore } from '../../store/sessionStore';
import { hudSound } from '../../lib/hudSound';

export default function HudEnvironment({ children }) {
  const canvasRef = useRef(null);
  const bootStartedRef = useRef(false);
  const currentSession = useSessionStore((state) => state.currentSession);
  
  // HUD Customization states
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(hudSound.isEnabled());
  const [booting, setBooting] = useState(true);
  const [bootLines, setBootLines] = useState([]);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [systemUptime, setSystemUptime] = useState(0);

  // Determine color theme based on active workspace/role
  const role = currentSession?.role; // 'red' or 'blue'
  const scenarioId = currentSession?.scenario_id;

  // Track system clock/uptime
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Bios boot sequence simulator
  useEffect(() => {
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
    setBootLines([]);

    const lines = [
      { text: "CYBERSIM SECURITY SYSTEMS LTD. [BIOS V4.1]", type: "info" },
      { text: "CPU: OCTA-CORE SANDBOX PROCESSOR AT 3.80GHz", type: "info" },
      { text: "MEMORY: 16384MB SECURE BUFFER SPACE POOL", type: "info" },
      { text: "NETWORK NODE ID: " + (scenarioId || "DSH-990"), type: "warn" },
      { text: "--------------------------------------------------", type: "info" },
      { text: "[ OK ] INITIALIZING BRIDGE NETWORKS (172.20.0.0/16)", type: "success" },
      { text: "[ OK ] SECURING CONTAINER RUNTIME SANDBOX LAYERS", type: "success" },
      { text: "[ OK ] CONNECTING TO REDIS PUB/SUB TELEMETRY BUS", type: "success" },
      { text: "[ OK ] ATTACHING ELASTIC SIEM LOGGING PARSER", type: "success" },
      { text: "[ OK ] GATING METHODOLOGY ENGINE SEC LEVEL A-1", type: "success" },
      { text: "[ OK ] BOOTING SOC INTEGRATION ORCHESTRATION...", type: "success" },
      { text: "DECRYPTION KEY LOADED: OK [SHA256-SIGNATURE]", type: "warn" },
      { text: "WELCOME OPERATOR. ACCESS GRANTED.", type: "success" },
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < lines.length) {
        const nextLine = lines[currentLine];
        if (nextLine) {
          setBootLines((prev) => [...prev, nextLine]);
        }
        currentLine++;
        // Play typing tick for boot text
        if (soundEnabled) {
          hudSound.playType();
        }
      } else {
        clearInterval(interval);
        // Play final boot chirp and end boot screen
        setTimeout(() => {
          if (soundEnabled) {
            hudSound.playBoot();
          }
          setBooting(false);
        }, 600);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [scenarioId, soundEnabled]);

  // Hook sound to global window click & mouse hover events
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // If user clicked a button, link, or input, trigger click sound
      const target = e.target;
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('a') || 
        target.closest('button') ||
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.classList.contains('btn-v3') ||
        target.classList.contains('card-v3-interactive');
      
      if (isInteractive) {
        hudSound.playClick();
      }
    };

    const handleGlobalMouseMove = (e) => {
      // Track coordinates for HUD display
      setCoords({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  const handleSoundToggle = () => {
    const newStatus = hudSound.toggle();
    setSoundEnabled(newStatus);
  };

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

      for (let i = 0; i < particleCount; i++) {
        const yIdx = i * 3 + 1;
        const xIdx = i * 3;
        posArray[yIdx] = initialY[i] + Math.sin(elapsedTime * speed[i] + posArray[xIdx]) * amplitude[i] * 0.3;
      }
      geometry.attributes.position.needsUpdate = true;

      particles.rotation.y = elapsedTime * 0.02;

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      camera.position.x = mouseX;
      camera.position.y = -mouseY;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

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
    <div className={`crt-container ${crtEnabled ? 'crt-screen crt-flicker' : ''}`}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-50 bg-[#030508] pointer-events-none"
        style={{ display: 'block' }}
      />

      {/* Vignette effect */}
      {crtEnabled && <div className="crt-vignette" />}

      {/* Cyber Boot Sequencer Overlay */}
      {booting ? (
        <div className="fixed inset-0 z-50 bg-[#030508] p-12 flex flex-col font-mono overflow-hidden">
          <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col justify-start">
            <div className="mb-8 border border-[#00ff88]/30 p-4 bg-[#00ff88]/5 flex items-center justify-between text-xs text-[#00ff88]">
              <div>CYBERSIM BOOT UTILITY V4.1</div>
              <div className="animate-pulse">STACK ONLINE</div>
            </div>
            
            <div className="space-y-1.5 overflow-y-auto max-h-[70vh]">
              {bootLines.map((line, i) => (
                <div key={i} className={`boot-console-line ${line?.type === 'warn' ? 'warn' : line?.type === 'success' ? 'boot-console-line' : line?.type === 'error' ? 'error' : 'info'}`}>
                  {line?.text}
                </div>
              ))}
              <div className="boot-console-line inline-block border-r border-[#00ff88] w-2 h-4 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full h-full min-h-screen">
          {children}

          {/* Floating Immersive HUD Control Panel */}
          <div className="fixed bottom-4 left-4 z-[99] flex items-center gap-2 font-mono text-[9px] bg-void/80 border border-cs-border backdrop-blur-md px-3 py-1.5 rounded-cs shadow-lg">
            <span className="text-txt-dim tracking-wider uppercase mr-1">HUD Options:</span>
            
            {/* Sound Toggle */}
            <button 
              onClick={handleSoundToggle}
              className={`px-2 py-0.5 border rounded-cs transition-all flex items-center gap-1 ${
                soundEnabled ? 'text-green-signal border-green-signal/30 bg-green-signal/5' : 'text-txt-dim border-cs-border hover:text-txt-secondary'
              }`}
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? (
                <>
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                  SOUND: ON
                </>
              ) : (
                <>
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  SOUND: OFF
                </>
              )}
            </button>

            {/* CRT Toggle */}
            <button 
              onClick={() => setCrtEnabled(!crtEnabled)}
              className={`px-2 py-0.5 border rounded-cs transition-all ${
                crtEnabled ? 'text-cs-blue border-cs-blue/30 bg-cs-blue/5' : 'text-txt-dim border-cs-border hover:text-txt-secondary'
              }`}
              title="Toggle Retro Screen Warp and Scanlines"
            >
              CRT: {crtEnabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>

          {/* Coordinates overlay bottom right */}
          <div className="fixed bottom-4 right-4 z-[99] pointer-events-none hud-coordinate-ticker select-none flex flex-col items-end opacity-70">
            <div>LOC: [{(coords.x / window.innerWidth * 100).toFixed(4)}, {(coords.y / window.innerHeight * 100).toFixed(4)}]</div>
            <div>SYS_CLK: {String(Math.floor(systemUptime / 60)).padStart(2, '0')}:{String(systemUptime % 60).padStart(2, '0')} // NODE: {scenarioId || "STANDBY"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
