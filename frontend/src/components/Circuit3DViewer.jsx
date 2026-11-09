import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Layers, 
  Play, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Info, 
  Sparkles,
  Zap
} from 'lucide-react';
import { playKeyBeep } from '../utils/audio';

export default function Circuit3DViewer() {
  const mountRef = useRef(null);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [pulseActive, setPulseActive] = useState(false);
  const [activeTxPath, setActiveTxPath] = useState('WITHDRAW');

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const blocksRef = useRef([]);
  const particlesRef = useRef([]);
  const targetCamPos = useRef({ x: 0, y: 5, z: 24 });
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  const sectionsInfo = {
    ALL: {
      letter: 'A–F',
      title: 'Complete Simulink DSD Hardware Architecture',
      desc: 'Overall end-to-end signal flow from Registered Data through Combinational Verification, 10-State FSM Controller, ALU Subsystems, and Discrete Sequential Balance Memory.',
      equation: 'Y = A · B · C (minterm m7 = 111)',
      blocks: 'Constants, Comparators, Stateflow Chart, 74HC283 Adders, 74HC85 Comparators, Unit Delay 1/z, Displays & Lamps'
    },
    A: {
      letter: 'A',
      title: 'Registered Data Unit & User Inputs',
      desc: 'Houses pre-configured backend credentials (REGISTERED_PIN 123456, CARD_ID 100123, INITIAL_BALANCE ₹5,000) and dashboard front-end controls.',
      equation: 'Data Types: PIN/Card uint32, Balance uint16',
      blocks: 'Constant Blocks, Dashboard Numeric Edit, Slider/Selector (00/01/10/11)'
    },
    B: {
      letter: 'B',
      title: 'Combinational Verification Unit',
      desc: 'Employs dual 32-bit equality comparators and an AND logic gate to authenticate user credentials before granting FSM state progression.',
      equation: 'AUTH_SUCCESS = PIN_VALID · CARD_VALID',
      blocks: '2x Relational Operators (==), 1x 2-Input Logical Operator (AND)'
    },
    C: {
      letter: 'C',
      title: 'Algorithmic FSM Controller (10 States)',
      desc: 'Stateflow algorithmic control unit governing state transitions (S0-IDLE through S11-END), operational handshaking, and memory write signals.',
      equation: 'States: S0-IDLE, S1-VERIFY, S2-SELECT, S3-WITHDRAW, S4-DEPOSIT, S5-BALANCE, S6-UPDATE, S7-OUTPUT, S8-REJECT',
      blocks: 'Stateflow Chart Controller, Control Lines: WITHDRAW_EN, DEPOSIT_EN, REGISTER_WRITE'
    },
    D: {
      letter: 'D',
      title: 'Transaction Processor & Arithmetic Logic Unit (ALU)',
      desc: 'Performs financial calculations across distinct execution paths: Subtraction with magnitude verification (A >= B), addition with 16-bit overflow prevention, and direct read.',
      equation: 'B_new = B_current - M (Withdraw) | B_new = B_current + M (Deposit)',
      blocks: '74HC85 Magnitude Comparator, 74HC283 4-Bit Adders, Multiport Switch'
    },
    E: {
      letter: 'E',
      title: 'Sequential Balance Memory Subsystem',
      desc: 'Preserves financial state across discrete simulation steps. Hardware-equivalent to 16 Parallel-In-Parallel-Out (PIPO) D Flip-Flops paired with a feedback multiplexer.',
      equation: 'Q_next = B_new when REGISTER_WRITE=1, else Q_current',
      blocks: 'Discrete-time Unit Delay (1/z, sample time=1s), Conditional Switch Block'
    },
    F: {
      letter: 'F',
      title: 'Final Output Unit & Dashboard Indicators',
      desc: 'Translates internal logic levels and register states into user-readable interface elements, including balance displays, green/red lamps, and thermal receipts.',
      equation: 'Output Signals: APPROVAL=1, REJECTION=1, RECEIPT_READY=1',
      blocks: 'Dashboard Numeric Displays, Green/Red Indicator Lamps, Scope Monitors'
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.025);

    // 2. Camera setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 6, 24);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x14b8a6, 2, 50);
    pointLight.position.set(0, 8, 5);
    scene.add(pointLight);

    // 5. Grid Floor (PCB Grid)
    const gridHelper = new THREE.GridHelper(40, 40, 0x0d9488, 0x1e293b);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 6. Create 3D Subsystems (A through F)
    const blockDefs = [
      { id: 'A', name: 'SEC A: INPUTS & CONSTANTS', pos: [-12, 1, 0], color: 0x06b6d4, size: [3.8, 2.5, 1.5] },
      { id: 'B', name: 'SEC B: VERIFICATION (==, AND)', pos: [-6, 1, 0], color: 0x3b82f6, size: [3.8, 2.5, 1.5] },
      { id: 'C', name: 'SEC C: FSM CONTROLLER', pos: [0, 1.5, 0], color: 0xf97316, size: [4.2, 3.0, 1.8] },
      { id: 'D', name: 'SEC D: ALU (ADD/SUB/COMP)', pos: [6, 1, 0], color: 0x10b981, size: [3.8, 2.5, 1.5] },
      { id: 'E', name: 'SEC E: UNIT DELAY (1/z)', pos: [6, -1, 3], color: 0x8b5cf6, size: [3.8, 2.0, 1.5] },
      { id: 'F', name: 'SEC F: OUTPUT LAMPS', pos: [12, 1, 0], color: 0xec4899, size: [3.6, 2.5, 1.5] },
    ];

    const blocks = [];
    blockDefs.forEach(def => {
      // Main chip body
      const geom = new THREE.BoxGeometry(...def.size);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.25,
        metalness: 0.8,
        emissive: def.color,
        emissiveIntensity: 0.15
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...def.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: def.id, name: def.name, baseColor: def.color };

      // Pin legs
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.1 });
      for (let p = -def.size[0] / 2 + 0.4; p < def.size[0] / 2; p += 0.8) {
        const pinGeom = new THREE.BoxGeometry(0.2, 0.4, 0.1);
        const pin1 = new THREE.Mesh(pinGeom, pinMat);
        pin1.position.set(p, -def.size[1] / 2 - 0.2, def.size[2] / 2);
        mesh.add(pin1);

        const pin2 = new THREE.Mesh(pinGeom, pinMat);
        pin2.position.set(p, -def.size[1] / 2 - 0.2, -def.size[2] / 2);
        mesh.add(pin2);
      }

      scene.add(mesh);
      blocks.push(mesh);
    });
    blocksRef.current = blocks;

    // 7. Connecting Bus Wires (Tubes with Glowing Pulses)
    const wireCurves = [
      new THREE.LineCurve3(new THREE.Vector3(-10, 1, 0), new THREE.Vector3(-8, 1, 0)),
      new THREE.LineCurve3(new THREE.Vector3(-4, 1, 0), new THREE.Vector3(-2.2, 1, 0)),
      new THREE.LineCurve3(new THREE.Vector3(2.2, 1, 0), new THREE.Vector3(4, 1, 0)),
      new THREE.LineCurve3(new THREE.Vector3(8, 1, 0), new THREE.Vector3(10, 1, 0)),
      // Feedback loop from D down to E, and E back to D
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(6, -0.2, 0),
        new THREE.Vector3(6, -0.5, 1.5),
        new THREE.Vector3(6, -0.5, 2.5)
      ),
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(4.5, -1, 3),
        new THREE.Vector3(2.5, -0.5, 2),
        new THREE.Vector3(4.5, 0.5, 0)
      )
    ];

    wireCurves.forEach(curve => {
      const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      scene.add(tube);
    });

    // 8. Animated Flow Particles
    const particleGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const particlePool = [];
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(particleGeom, particleMat);
      p.visible = false;
      scene.add(p);
      particlePool.push({
        mesh: p,
        progress: (i / 12),
        speed: 0.005 + (i % 3) * 0.002
      });
    }
    particlesRef.current = particlePool;

    // 9. Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera lerp
      camera.position.x += (targetCamPos.current.x - camera.position.x) * 0.05;
      camera.position.y += (targetCamPos.current.y - camera.position.y) * 0.05;
      camera.position.z += (targetCamPos.current.z - camera.position.z) * 0.05;
      camera.lookAt(
        targetCamPos.current.x * 0.6,
        targetCamPos.current.y * 0.4,
        0
      );

      // Gentle floating chips
      const time = performance.now() * 0.0015;
      blocks.forEach((b, i) => {
        b.position.y += Math.sin(time + i * 1.5) * 0.002;
      });

      // Animate particles along signal wires
      particlesRef.current.forEach(item => {
        item.mesh.visible = true;
        item.progress = (item.progress + item.speed) % 1;
        // Map progress from -12 to +12 on x axis
        const t = item.progress;
        item.mesh.position.x = -12 + t * 24;
        item.mesh.position.y = 1 + Math.sin(t * Math.PI * 4) * 0.3;
        item.mesh.position.z = Math.sin(t * Math.PI * 2) * 0.8;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 10. Window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
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
      targetCamPos.current = { x: 0, y: 5, z: 24 };
    } else if (sec === 'A') {
      targetCamPos.current = { x: -12, y: 2.5, z: 8 };
    } else if (sec === 'B') {
      targetCamPos.current = { x: -6, y: 2.5, z: 8 };
    } else if (sec === 'C') {
      targetCamPos.current = { x: 0, y: 3.5, z: 9 };
    } else if (sec === 'D') {
      targetCamPos.current = { x: 6, y: 2.5, z: 8 };
    } else if (sec === 'E') {
      targetCamPos.current = { x: 6, y: 0.5, z: 9 };
    } else if (sec === 'F') {
      targetCamPos.current = { x: 12, y: 2.5, z: 8 };
    }

    // Highlight block
    if (blocksRef.current) {
      blocksRef.current.forEach(b => {
        if (sec === 'ALL' || b.userData.id === sec) {
          b.material.emissiveIntensity = 0.6;
        } else {
          b.material.emissiveIntensity = 0.05;
        }
      });
    }
  };

  const triggerSignalPulse = (path) => {
    setActiveTxPath(path);
    setPulseActive(true);
    playKeyBeep(1600, 0.08);
    setTimeout(() => setPulseActive(false), 2000);
  };

  const currentInfo = sectionsInfo[selectedSection] || sectionsInfo.ALL;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <Box className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white font-['Chakra_Petch']">
              3D Interactive Circuit Explorer (Simulink Model)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive WebGL visualization of Sections A–F • Click any section to zoom & inspect
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => triggerSignalPulse('WITHDRAW')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Pulse Withdrawal (00)</span>
          </button>

          <button
            onClick={() => triggerSignalPulse('DEPOSIT')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Pulse Deposit (01)</span>
          </button>

          <button
            onClick={() => handleSelectSection('ALL')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Camera View"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
              selectedSection === sec
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 scale-105'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            {sec === 'ALL' ? 'View Entire Circuit (A–F)' : `Section ${sec}`}
          </button>
        ))}
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div className="relative w-full h-[450px] sm:h-[500px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating HUD Card for Selected Section */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-2 pointer-events-auto animate-slide-up">
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
              Active Subsystem
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentInfo.desc}
          </p>

          <div className="pt-1.5 text-[11px] font-mono space-y-1">
            <div className="text-teal-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">BOOLEAN / LOGIC EQUATION:</span>
              <strong>{currentInfo.equation}</strong>
            </div>

            <div className="text-slate-400">
              <span className="text-slate-500 text-[10px]">IMPLEMENTATION BLOCKS: </span>
              {currentInfo.blocks}
            </div>
          </div>
        </div>

        {/* Canvas instruction overlay */}
        <div className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur-sm border border-slate-800 rounded-xl px-3 py-1 text-[11px] font-mono text-slate-400">
          Click & Drag to Rotate • Mouse Wheel to Zoom
        </div>
      </div>
    </div>
  );
}

