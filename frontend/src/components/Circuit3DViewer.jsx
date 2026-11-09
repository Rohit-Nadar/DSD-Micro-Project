import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Layers, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Zap,
  Image as ImageIcon,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { playKeyBeep } from '../utils/audio';

// Helper function to create canvas-based textures with laser-etched IC text
function createChipTexture(label, sublabel, chipColor = '#0F172A', textColor = '#38BDF8') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Background IC packaging
  ctx.fillStyle = chipColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border / bevel
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  // IC Pin 1 notch and indicator dot
  ctx.beginPath();
  ctx.arc(35, canvas.height / 2, 18, -Math.PI / 2, Math.PI / 2, true);
  ctx.fillStyle = '#1E293B';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(60, 45, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#64748B';
  ctx.fill();

  // Header label
  ctx.fillStyle = textColor;
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, canvas.width / 2 + 15, 110);

  // Sublabel
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px monospace';
  ctx.fillText(sublabel, canvas.width / 2 + 15, 160);

  // Circuit series number
  ctx.fillStyle = '#475569';
  ctx.font = '14px monospace';
  ctx.fillText('KITS-DSD • 25DC205', canvas.width / 2 + 15, 210);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function Circuit3DViewer() {
  const mountRef = useRef(null);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [activeSignal, setActiveSignal] = useState(null); // 'WITHDRAW' | 'DEPOSIT' | null
  const [viewMode, setViewMode] = useState('3D'); // '3D' | 'SCHEMATIC'

  // Scene references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const blocksRef = useRef([]);
  const pulseParticlesRef = useRef([]);
  const reqAnimIdRef = useRef(null);

  // Orbit camera angles (Spherical coordinates)
  const cameraDistance = useRef(24);
  const targetLookAt = useRef(new THREE.Vector3(0, 0.5, 0));
  const currentCamPos = useRef(new THREE.Vector3(0, 5, 24));
  const targetCamPos = useRef(new THREE.Vector3(0, 5, 24));

  // Drag state
  const isDragging = useRef(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const spherical = useRef({ radius: 24, theta: 0, phi: Math.PI / 2.8 });

  const sectionsInfo = {
    ALL: {
      letter: 'A–F',
      title: 'Complete Simulink DSD Hardware Architecture',
      desc: 'Overall modular digital architecture combining factory-programmed data constants, 32-bit equality comparators, a 10-state Stateflow FSM controller, 16-bit ALU adders/subtractors, and a 16-bit PIPO Unit Delay balance register.',
      equation: 'Approval Equation: Y = A · B · C (minterm m7 = 111)',
      blocks: 'Constant Blocks, Comparators (==), Stateflow Chart, 74HC283 Adders, 74HC85 Comparators, Unit Delay 1/z, Indicator Lamps'
    },
    A: {
      letter: 'A',
      title: 'Section A: Registered Data & User Inputs',
      desc: 'Stores factory-programmed constants (REGISTERED_PIN 123456, REGISTERED_CARD_ID 100123, INITIAL_BALANCE ₹5,000) and dashboard front-end input numeric edit blocks.',
      equation: 'Types: CARD_ID uint32, PIN uint32, AMOUNT uint16, OP 2-bit (00/01/10/11)',
      blocks: 'Constant Blocks (Sources library), Dashboard Numeric Edit, Slider Opcode Selector'
    },
    B: {
      letter: 'B',
      title: 'Section B: Combinational Verification Subsystem',
      desc: 'Employs dual 32-bit equality comparators (==) and a 2-input AND logic gate to authenticate entered credentials before granting state progression.',
      equation: 'AUTH_SUCCESS = PIN_VALID (A) · CARD_VALID (B)',
      blocks: '2x Relational Operators (==), 1x 2-Input Logical Operator (AND)'
    },
    C: {
      letter: 'C',
      title: 'Section C: Algorithmic FSM Controller',
      desc: '10-State Stateflow Chart governing sequential state execution (S0-IDLE through S11-END), operational handshaking, and memory write-enables.',
      equation: 'States: S0-IDLE, S1-VERIFY, S2-SELECT, S3-WITHDRAW, S4-DEPOSIT, S5-BALANCE, S6-UPDATE, S7-OUTPUT, S8-REJECT',
      blocks: 'Stateflow Chart Controller, Control Lines: WITHDRAW_EN, DEPOSIT_EN, REGISTER_WRITE'
    },
    D: {
      letter: 'D',
      title: 'Section D: Transaction Processor & Arithmetic ALU',
      desc: 'Executes financial arithmetic: Subtraction with magnitude comparator (A >= B), addition with 16-bit overflow limiter (<= 65,535), and direct read routing.',
      equation: 'Withdrawal: B_new = B_current - M | Deposit: B_new = B_current + M',
      blocks: '74HC85 4-Bit Magnitude Comparator, 74HC283 4-Bit Binary Adders, Multiport Switch'
    },
    E: {
      letter: 'E',
      title: 'Section E: Sequential Balance Memory (Unit Delay 1/z)',
      desc: 'Preserves financial state across discrete simulation steps. Hardware-equivalent to 16 Parallel-In-Parallel-Out (PIPO) D Flip-Flops paired with a feedback multiplexer.',
      equation: 'Q_next = B_new when REGISTER_WRITE=1, else Q_current (Hold State)',
      blocks: 'Discrete-time Unit Delay block (1/z, sample time=1.0s, initial=5000), Feedback Switch'
    },
    F: {
      letter: 'F',
      title: 'Section F: Final Output Unit & Dashboard Displays',
      desc: 'Translates internal logic levels and register states into user-readable visual feedback, including balance displays, green/red indicator lamps, and thermal receipts.',
      equation: 'Control Signals: APPROVAL=1, REJECTION=1, RECEIPT_READY=1',
      blocks: 'Dashboard Numeric Displays, Green/Red Indicator Lamps, Scope Monitors'
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Determine initial dimensions with safe fallbacks
    let width = mountRef.current.clientWidth || 850;
    let height = mountRef.current.clientHeight || 500;
    if (width < 300) width = 850;
    if (height < 300) height = 500;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.02);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 24);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Clean previous children
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // 4. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
    mainLight.position.set(12, 20, 15);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const tealAccentLight = new THREE.PointLight(0x14b8a6, 2.5, 45);
    tealAccentLight.position.set(0, 6, 8);
    scene.add(tealAccentLight);

    const blueBackLight = new THREE.PointLight(0x3b82f6, 1.8, 35);
    blueBackLight.position.set(-10, 4, -4);
    scene.add(blueBackLight);

    // 5. Circuit PCB Grid Floor
    const grid = new THREE.GridHelper(38, 38, 0x0d9488, 0x1e293b);
    grid.position.y = -2;
    scene.add(grid);

    // 6. Subsystem IC Block Definitions (Sections A to F)
    const blockDefs = [
      {
        id: 'A',
        name: 'SEC A: INPUTS & CONSTANTS',
        sub: 'PIN 123456 • CARD 100123',
        pos: [-12, 1, 0],
        size: [3.8, 2.0, 2.0],
        accentColor: 0x06b6d4,
        chipColor: '#082f49'
      },
      {
        id: 'B',
        name: 'SEC B: VERIFICATION (==, AND)',
        sub: 'AUTH = PIN · CARD',
        pos: [-6, 1, 0],
        size: [3.8, 2.0, 2.0],
        accentColor: 0x3b82f6,
        chipColor: '#1e3a8a'
      },
      {
        id: 'C',
        name: 'SEC C: FSM CONTROLLER',
        sub: '10-STATE STATEFLOW',
        pos: [0, 1.3, 0],
        size: [4.2, 2.4, 2.2],
        accentColor: 0xf97316,
        chipColor: '#7c2d12'
      },
      {
        id: 'D',
        name: 'SEC D: ALU ARITHMETIC',
        sub: '74HC85 & 74HC283',
        pos: [6, 1, 0],
        size: [3.8, 2.0, 2.0],
        accentColor: 0x10b981,
        chipColor: '#064e3b'
      },
      {
        id: 'E',
        name: 'SEC E: UNIT DELAY (1/z)',
        sub: '16-BIT PIPO REGISTER',
        pos: [6, -0.9, 2.8],
        size: [3.8, 1.8, 1.8],
        accentColor: 0x8b5cf6,
        chipColor: '#4c1d95'
      },
      {
        id: 'F',
        name: 'SEC F: OUTPUT INDICATORS',
        sub: 'DISPLAY & LAMPS',
        pos: [12, 1, 0],
        size: [3.6, 2.0, 2.0],
        accentColor: 0xec4899,
        chipColor: '#831843'
      }
    ];

    const blocks = [];
    const pinMaterial = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.1 });

    blockDefs.forEach(def => {
      const geom = new THREE.BoxGeometry(...def.size);

      // Top texture with laser-engraved chip label
      const topTex = createChipTexture(def.name, def.sub, def.chipColor, '#' + def.accentColor.toString(16).padStart(6, '0'));
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
        metalness: 0.7
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.25,
        metalness: 0.6,
        emissive: def.accentColor,
        emissiveIntensity: 0.2
      });

      // Box materials: [right, left, top, bottom, front, back]
      const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      const mesh = new THREE.Mesh(geom, materials);
      mesh.position.set(...def.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: def.id, name: def.name, baseColor: def.accentColor };

      // Add dual-inline pin legs along edges
      const pinWidth = 0.18;
      const pinLength = 0.45;
      const pinDepth = 0.08;
      const pinGeom = new THREE.BoxGeometry(pinWidth, pinLength, pinDepth);

      for (let x = -def.size[0] / 2 + 0.4; x <= def.size[0] / 2 - 0.4; x += 0.7) {
        // Front pin
        const p1 = new THREE.Mesh(pinGeom, pinMaterial);
        p1.position.set(x, -def.size[1] / 2 - pinLength / 2 + 0.1, def.size[2] / 2);
        mesh.add(p1);

        // Back pin
        const p2 = new THREE.Mesh(pinGeom, pinMaterial);
        p2.position.set(x, -def.size[1] / 2 - pinLength / 2 + 0.1, -def.size[2] / 2);
        mesh.add(p2);
      }

      scene.add(mesh);
      blocks.push(mesh);
    });
    blocksRef.current = blocks;

    // 7. Connecting Copper Bus Wires (Tubes with Glowing Pulses)
    const busCurves = [
      new THREE.LineCurve3(new THREE.Vector3(-10, 1, 0), new THREE.Vector3(-8, 1, 0)),
      new THREE.LineCurve3(new THREE.Vector3(-4, 1, 0), new THREE.Vector3(-2.2, 1, 0)),
      new THREE.LineCurve3(new THREE.Vector3(2.2, 1, 0), new THREE.Vector3(4, 1, 0)),
      new THREE.LineCurve3(new THREE.Vector3(8, 1, 0), new THREE.Vector3(10, 1, 0)),
      // Feedback loop from D down to E, and E back into D
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(6, 0.0, 0),
        new THREE.Vector3(6, -0.4, 1.4),
        new THREE.Vector3(6, -0.9, 2.0)
      ),
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(4.2, -0.9, 2.8),
        new THREE.Vector3(2.5, -0.3, 1.8),
        new THREE.Vector3(4.2, 0.5, 0)
      )
    ];

    busCurves.forEach(curve => {
      const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.09, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      scene.add(tube);
    });

    // 8. Animated Flow Particles (Glowing Signal Beams)
    const particleGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const particlePool = [];

    for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(particleGeom, particleMat);
      scene.add(p);
      particlePool.push({
        mesh: p,
        progress: (i / 16),
        speed: 0.006 + (i % 2) * 0.002
      });
    }
    pulseParticlesRef.current = particlePool;

    // 9. Render & Animation Loop
    const animate = () => {
      reqAnimIdRef.current = requestAnimationFrame(animate);

      // Smooth camera interpolation towards target
      currentCamPos.current.lerp(targetCamPos.current, 0.06);
      camera.position.copy(currentCamPos.current);
      camera.lookAt(targetLookAt.current);

      // Floating vibration on chips
      const t = performance.now() * 0.0015;
      blocks.forEach((b, idx) => {
        b.position.y += Math.sin(t + idx * 1.3) * 0.0018;
      });

      // Animate signal pulses across the 3D bus
      pulseParticlesRef.current.forEach(item => {
        item.progress = (item.progress + item.speed) % 1;
        const progress = item.progress;

        // Trace path from X = -12 to +12
        item.mesh.position.x = -12 + progress * 24;
        item.mesh.position.y = 1 + Math.sin(progress * Math.PI * 4) * 0.25;
        item.mesh.position.z = Math.sin(progress * Math.PI * 2) * 0.6;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 10. Robust ResizeObserver (never crashes on 0px tab switches)
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && camera && renderer) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    // 11. Mouse Drag & Wheel Orbit Controls
    const domElem = renderer.domElement;

    const onMouseDown = (e) => {
      isDragging.current = true;
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - mousePos.current.x;
      const dy = e.clientY - mousePos.current.y;
      mousePos.current = { x: e.clientX, y: e.clientY };

      spherical.current.theta -= dx * 0.008;
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.current.phi - dy * 0.008));

      // Calculate new camera target position
      const r = spherical.current.radius;
      targetCamPos.current.x = targetLookAt.current.x + r * Math.sin(spherical.current.phi) * Math.sin(spherical.current.theta);
      targetCamPos.current.y = targetLookAt.current.y + r * Math.cos(spherical.current.phi);
      targetCamPos.current.z = targetLookAt.current.z + r * Math.sin(spherical.current.phi) * Math.cos(spherical.current.theta);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.current.radius = Math.max(8, Math.min(36, spherical.current.radius + e.deltaY * 0.02));
      const r = spherical.current.radius;
      targetCamPos.current.x = targetLookAt.current.x + r * Math.sin(spherical.current.phi) * Math.sin(spherical.current.theta);
      targetCamPos.current.y = targetLookAt.current.y + r * Math.cos(spherical.current.phi);
      targetCamPos.current.z = targetLookAt.current.z + r * Math.sin(spherical.current.phi) * Math.cos(spherical.current.theta);
    };

    // Click on 3D Chip to Select Section
    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const onClick = (e) => {
      const rect = domElem.getBoundingClientRect();
      mouseCoord.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseCoord, camera);
      const intersects = raycaster.intersectObjects(blocks);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.id) {
          handleSelectSection(hit.userData.id);
        }
      }
    };

    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });
    domElem.addEventListener('click', onClick);

    return () => {
      if (reqAnimIdRef.current) cancelAnimationFrame(reqAnimIdRef.current);
      resizeObserver.disconnect();
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElem.removeEventListener('wheel', onWheel);
      domElem.removeEventListener('click', onClick);

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Camera View when Section changes
  const handleSelectSection = (sec) => {
    setSelectedSection(sec);
    playKeyBeep(1200, 0.04);

    if (sec === 'ALL') {
      targetLookAt.current.set(0, 0.5, 0);
      spherical.current.radius = 24;
      spherical.current.theta = 0;
      spherical.current.phi = Math.PI / 2.8;
    } else if (sec === 'A') {
      targetLookAt.current.set(-12, 1, 0);
      spherical.current.radius = 8;
      spherical.current.theta = 0.1;
      spherical.current.phi = Math.PI / 3.0;
    } else if (sec === 'B') {
      targetLookAt.current.set(-6, 1, 0);
      spherical.current.radius = 8;
      spherical.current.theta = 0.1;
      spherical.current.phi = Math.PI / 3.0;
    } else if (sec === 'C') {
      targetLookAt.current.set(0, 1.3, 0);
      spherical.current.radius = 9;
      spherical.current.theta = 0;
      spherical.current.phi = Math.PI / 3.0;
    } else if (sec === 'D') {
      targetLookAt.current.set(6, 1, 0);
      spherical.current.radius = 8;
      spherical.current.theta = -0.1;
      spherical.current.phi = Math.PI / 3.0;
    } else if (sec === 'E') {
      targetLookAt.current.set(6, -0.9, 2.8);
      spherical.current.radius = 8;
      spherical.current.theta = -0.2;
      spherical.current.phi = Math.PI / 3.2;
    } else if (sec === 'F') {
      targetLookAt.current.set(12, 1, 0);
      spherical.current.radius = 8;
      spherical.current.theta = -0.15;
      spherical.current.phi = Math.PI / 3.0;
    }

    const r = spherical.current.radius;
    targetCamPos.current.x = targetLookAt.current.x + r * Math.sin(spherical.current.phi) * Math.sin(spherical.current.theta);
    targetCamPos.current.y = targetLookAt.current.y + r * Math.cos(spherical.current.phi);
    targetCamPos.current.z = targetLookAt.current.z + r * Math.sin(spherical.current.phi) * Math.cos(spherical.current.theta);

    // Highlight active chip
    if (blocksRef.current) {
      blocksRef.current.forEach(b => {
        const topMaterial = b.material[2];
        if (topMaterial) {
          if (sec === 'ALL' || b.userData.id === sec) {
            topMaterial.emissiveIntensity = 0.6;
          } else {
            topMaterial.emissiveIntensity = 0.1;
          }
        }
      });
    }
  };

  const triggerSignalPulse = (path) => {
    setActiveSignal(path);
    playKeyBeep(1600, 0.08);

    // Accelerate particle speed during pulse
    if (pulseParticlesRef.current) {
      pulseParticlesRef.current.forEach(p => {
        p.speed = 0.02;
        p.mesh.material.color.setHex(path === 'WITHDRAW' ? 0xf59e0b : 0x10b981);
      });
    }

    setTimeout(() => {
      setActiveSignal(null);
      if (pulseParticlesRef.current) {
        pulseParticlesRef.current.forEach(p => {
          p.speed = 0.006;
          p.mesh.material.color.setHex(0x22d3ee);
        });
      }
    }, 2200);
  };

  const currentInfo = sectionsInfo[selectedSection] || sectionsInfo.ALL;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Box className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white font-['Chakra_Petch']">
              3D Interactive Circuit Explorer (Simulink Model)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time WebGL visualization of Sections A–F • Click any chip or use the section selector below
          </p>
        </div>

        {/* View Mode & Pulse Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 3D vs Schematic Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => {
                playKeyBeep(1000, 0.04);
                setViewMode('3D');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                viewMode === '3D' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              3D WebGL
            </button>
            <button
              onClick={() => {
                playKeyBeep(1000, 0.04);
                setViewMode('SCHEMATIC');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                viewMode === 'SCHEMATIC' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulink Schematics
            </button>
          </div>

          <button
            onClick={() => triggerSignalPulse('WITHDRAW')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold font-mono transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Pulse Withdraw (00)</span>
          </button>

          <button
            onClick={() => triggerSignalPulse('DEPOSIT')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold font-mono transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Pulse Deposit (01)</span>
          </button>

          <button
            onClick={() => handleSelectSection('ALL')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Camera View to Default"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['ALL', 'A', 'B', 'C', 'D', 'E', 'F'].map(sec => (
          <button
            key={sec}
            onClick={() => handleSelectSection(sec)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
              selectedSection === sec
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 scale-105'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            {sec === 'ALL' ? 'View Entire Circuit (A–F)' : `Section ${sec}`}
          </button>
        ))}
      </div>

      {/* 3D WebGL Canvas Viewport OR Schematic View */}
      {viewMode === '3D' ? (
        <div className="relative w-full h-[480px] sm:h-[530px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating HUD Card for Selected Section */}
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-2 pointer-events-auto animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="h-6 w-6 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center text-xs font-bold font-mono">
                  {currentInfo.letter}
                </span>
                <span className="font-bold text-sm text-white font-['Chakra_Petch']">
                  {currentInfo.title}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400">
                Subsystem Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentInfo.desc}
            </p>

            <div className="pt-1.5 text-[11px] font-mono space-y-1">
              <div className="text-teal-300 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EQUATION / SPECIFICATION:</span>
                <strong className="text-xs">{currentInfo.equation}</strong>
              </div>

              <div className="text-slate-400 text-[11px] pt-1">
                <span className="text-slate-500 text-[10px] block">SIMULINK / HARDWARE BLOCKS:</span>
                {currentInfo.blocks}
              </div>
            </div>
          </div>

          {/* Floating Instructions Pill */}
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300 shadow-lg flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
            <span>Click & Drag to Rotate • Wheel to Zoom • Click Chip to Inspect</span>
          </div>

          {/* Active Pulse Banner */}
          {activeSignal && (
            <div className="absolute top-4 left-4 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl text-xs font-mono font-bold animate-pulse flex items-center space-x-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>Transmitting {activeSignal} Signal across Bus Wires...</span>
            </div>
          )}
        </div>
      ) : (
        /* High-Res Schematic Inspection View */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base font-['Chakra_Petch']">
                Simulink Hardware Circuit Diagrams (Original Materials)
              </h3>
              <p className="text-xs text-slate-400">
                High-resolution diagrams extracted from Continuous Internal Examination documentation
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/30">
              Verified 25DC205
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-mono text-xs font-bold text-teal-400 block">
                Figure 1: Modular System Architecture (Sections A through F)
              </span>
              <img 
                src="/assets/ppt_image7.png" 
                alt="System Architecture" 
                className="w-full h-56 object-contain rounded-xl bg-slate-900/60 p-2"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-mono text-xs font-bold text-teal-400 block">
                Figure 2: ALU 74HC283 Adder & 74HC85 Magnitude Comparator
              </span>
              <img 
                src="/assets/image8.png" 
                alt="ALU Circuit" 
                className="w-full h-56 object-contain rounded-xl bg-slate-900/60 p-2"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-mono text-xs font-bold text-teal-400 block">
                Figure 3: Sequential Balance Memory Subsystem (Unit Delay 1/z)
              </span>
              <img 
                src="/assets/ppt_image10.png" 
                alt="Sequential Balance Memory" 
                className="w-full h-56 object-contain rounded-xl bg-slate-900/60 p-2"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-mono text-xs font-bold text-teal-400 block">
                Figure 4: Authentication Unit (Dual Comparators & AND Gate)
              </span>
              <img 
                src="/assets/ppt_image8.png" 
                alt="Authentication Logic" 
                className="w-full h-56 object-contain rounded-xl bg-slate-900/60 p-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
