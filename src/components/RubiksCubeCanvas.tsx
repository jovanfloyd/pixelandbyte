import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CubeConfig, FaceName, MoveStep, MoveType, StickerConfig, ThemeMode } from '../types/cube';
import { FACE_METAS } from '../constants/defaultCubeConfig';
import { generateStickerTexture } from '../utils/textureGenerator';
import { cubeAudio } from '../utils/audio';

interface RubiksCubeCanvasProps {
  config: CubeConfig;
  theme: ThemeMode;
  onStickerClick: (sticker: StickerConfig) => void;
  onMoveComplete?: (move: MoveType) => void;
  registerMoveHandler?: (handler: (move: MoveType) => Promise<void>) => void;
  registerScrambleHandler?: (handler: () => Promise<void>) => void;
  registerResetHandler?: (handler: () => Promise<void>) => void;
  registerViewResetHandler?: (handler: (preset?: string) => void) => void;
}

interface CubieData {
  mesh: THREE.Group;
  currentPos: THREE.Vector3; // -1, 0, 1 in cube space
  initialPos: THREE.Vector3;
  stickerMeshes: Map<FaceName, { mesh: THREE.Mesh; row: number; col: number; face: FaceName }>;
}

export const RubiksCubeCanvas: React.FC<RubiksCubeCanvasProps> = ({
  config,
  theme,
  onStickerClick,
  onMoveComplete,
  registerMoveHandler,
  registerScrambleHandler,
  registerResetHandler,
  registerViewResetHandler,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeRootRef = useRef<THREE.Group | null>(null);
  const pivotGroupRef = useRef<THREE.Group | null>(null);
  const cubiesRef = useRef<CubieData[]>([]);

  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Interaction State
  const isInteractingRef = useRef(false);
  const isDraggingSliceRef = useRef(false);
  const isOrbitingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchRadiusRef = useRef<number>(9.5);

  const activeHitRef = useRef<{
    cubie: CubieData;
    faceName: FaceName;
    worldNormal: THREE.Vector3;
    sticker?: StickerConfig;
  } | null>(null);

  // Active layer slice drag state
  const activeSliceDragRef = useRef<{
    axis: 'x' | 'y' | 'z';
    layerValue: number; // -1, 0, 1
    screenDragDir: THREE.Vector2;
    activeCubies: CubieData[];
    accumulatedAngle: number;
    initialRotations: Map<CubieData, THREE.Quaternion>;
    initialPositions: Map<CubieData, THREE.Vector3>;
  } | null>(null);

  // Camera Orbit angles with responsive distance for mobile and desktop
  const computeInitialRadius = () => {
    if (typeof window === 'undefined') return 9.5;
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    return aspect < 0.75 ? 13.5 : aspect < 1.0 ? 11.2 : 9.0;
  };

  const initialRadius = computeInitialRadius();

  const orbitRef = useRef({
    theta: Math.PI / 4, // 45 deg azimuth
    phi: Math.PI / 3.2, // ~56 deg elevation (isometric viewpoint)
    radius: initialRadius,
    targetTheta: Math.PI / 4,
    targetPhi: Math.PI / 3.2,
    targetRadius: initialRadius,
  });

  const isAnimatingMoveRef = useRef(false);
  const moveQueueRef = useRef<MoveStep[]>([]);
  const [isSolvingOrScrambling, setIsSolvingOrScrambling] = useState(false);

  // Map 3D coordinate on face to (row, col)
  const getRowColForFace = useCallback((face: FaceName, x: number, y: number, z: number): { row: number; col: number } => {
    let row = 0;
    let col = 0;

    switch (face) {
      case 'front': // normal +Z
        col = Math.round(x) + 1; // x: -1 -> 0, 0 -> 1, 1 -> 2
        row = 1 - Math.round(y); // y: 1 -> 0, 0 -> 1, -1 -> 2
        break;
      case 'back': // normal -Z
        col = 1 - Math.round(x); // x: 1 -> 0, 0 -> 1, -1 -> 2
        row = 1 - Math.round(y);
        break;
      case 'up': // normal +Y
        col = Math.round(x) + 1;
        row = Math.round(z) + 1; // z: -1 -> 0, 0 -> 1, 1 -> 2
        break;
      case 'down': // normal -Y
        col = Math.round(x) + 1;
        row = 1 - Math.round(z);
        break;
      case 'right': // normal +X
        col = 1 - Math.round(z); // z: 1 -> 0, 0 -> 1, -1 -> 2
        row = 1 - Math.round(y);
        break;
      case 'left': // normal -X
        col = Math.round(z) + 1;
        row = 1 - Math.round(y);
        break;
    }
    return { row: Math.max(0, Math.min(2, row)), col: Math.max(0, Math.min(2, col)) };
  }, []);

  // Update textures of all stickers
  const refreshStickers = useCallback(() => {
    cubiesRef.current.forEach((cubie) => {
      cubie.stickerMeshes.forEach(({ mesh, row, col, face }) => {
        const stickerId = `${face}-${row}-${col}`;
        const sticker = config.stickers[stickerId];
        if (sticker) {
          const faceColor = config.faceColors[face] || FACE_METAS[face].color;
          const texture = generateStickerTexture(sticker, faceColor, config.filterOpacity, () => {
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
          });
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.map = texture;
          mat.needsUpdate = true;
        }
      });
    });
  }, [config]);

  // Execute a logical 90 degree slice rotation
  const executeMoveStep = useCallback((step: MoveStep, duration = 240): Promise<void> => {
    return new Promise((resolve) => {
      if (!cubeRootRef.current || !pivotGroupRef.current) {
        resolve();
        return;
      }

      isAnimatingMoveRef.current = true;
      cubeAudio.playTurnSound();

      const { axis, layer, direction } = step;
      const pivot = pivotGroupRef.current;
      pivot.rotation.set(0, 0, 0);

      // Find the 9 cubies in this layer
      const targetCubies: CubieData[] = [];
      const threshold = 0.45;

      cubiesRef.current.forEach((cubie) => {
        const val = cubie.currentPos[axis];
        if (Math.abs(val - layer) < threshold) {
          targetCubies.push(cubie);
        }
      });

      // Attach cubies to pivot
      targetCubies.forEach((c) => {
        pivot.attach(c.mesh);
      });

      const targetAngle = (Math.PI / 2) * direction;
      const startTime = performance.now();

      const animateSlice = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Smooth ease-out quad curve
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentAngle = targetAngle * ease;

        if (axis === 'x') pivot.rotation.x = currentAngle;
        if (axis === 'y') pivot.rotation.y = currentAngle;
        if (axis === 'z') pivot.rotation.z = currentAngle;

        if (progress < 1) {
          requestAnimationFrame(animateSlice);
        } else {
          // Finalize rotation
          if (axis === 'x') pivot.rotation.x = targetAngle;
          if (axis === 'y') pivot.rotation.y = targetAngle;
          if (axis === 'z') pivot.rotation.z = targetAngle;

          pivot.updateMatrixWorld(true);

          // Detach each cubie and round its position
          const rotMatrix = new THREE.Matrix4();
          if (axis === 'x') rotMatrix.makeRotationX(targetAngle);
          if (axis === 'y') rotMatrix.makeRotationY(targetAngle);
          if (axis === 'z') rotMatrix.makeRotationZ(targetAngle);

          targetCubies.forEach((c) => {
            cubeRootRef.current!.attach(c.mesh);

            // Update logical position
            c.currentPos.applyMatrix4(rotMatrix);
            c.currentPos.x = Math.round(c.currentPos.x);
            c.currentPos.y = Math.round(c.currentPos.y);
            c.currentPos.z = Math.round(c.currentPos.z);
          });

          pivot.rotation.set(0, 0, 0);
          pivot.updateMatrixWorld(true);

          cubeAudio.playSnapSound();
          isAnimatingMoveRef.current = false;
          if (onMoveComplete) {
            onMoveComplete(step.name);
          }
          resolve();
        }
      };

      requestAnimationFrame(animateSlice);
    });
  }, [onMoveComplete]);

  // Convert MoveType notation to MoveStep
  const parseMove = useCallback((move: MoveType): MoveStep => {
    switch (move) {
      case 'U': return { axis: 'y', layer: 1, direction: -1, name: 'U' };
      case "U'": return { axis: 'y', layer: 1, direction: 1, name: "U'" };
      case 'D': return { axis: 'y', layer: -1, direction: 1, name: 'D' };
      case "D'": return { axis: 'y', layer: -1, direction: -1, name: "D'" };
      case 'L': return { axis: 'x', layer: -1, direction: 1, name: 'L' };
      case "L'": return { axis: 'x', layer: -1, direction: -1, name: "L'" };
      case 'R': return { axis: 'x', layer: 1, direction: -1, name: 'R' };
      case "R'": return { axis: 'x', layer: 1, direction: 1, name: "R'" };
      case 'F': return { axis: 'z', layer: 1, direction: -1, name: 'F' };
      case "F'": return { axis: 'z', layer: 1, direction: 1, name: "F'" };
      case 'B': return { axis: 'z', layer: -1, direction: 1, name: 'B' };
      case "B'": return { axis: 'z', layer: -1, direction: -1, name: "B'" };
      case 'M': return { axis: 'x', layer: 0, direction: 1, name: 'M' };
      case "M'": return { axis: 'x', layer: 0, direction: -1, name: "M'" };
      case 'E': return { axis: 'y', layer: 0, direction: 1, name: 'E' };
      case "E'": return { axis: 'y', layer: 0, direction: -1, name: "E'" };
      case 'S': return { axis: 'z', layer: 0, direction: -1, name: 'S' };
      case "S'": return { axis: 'z', layer: 0, direction: 1, name: "S'" };
    }
  }, []);

  // Public move handler
  const handlePerformMove = useCallback(async (move: MoveType) => {
    if (isAnimatingMoveRef.current) {
      return;
    }
    const step = parseMove(move);
    await executeMoveStep(step, 240);
  }, [executeMoveStep, parseMove]);

  // Scramble animation
  const handleScramble = useCallback(async () => {
    if (isAnimatingMoveRef.current || isSolvingOrScrambling) return;
    setIsSolvingOrScrambling(true);

    const moves: MoveType[] = ['U', "U'", 'D', "D'", 'L', "L'", 'R', "R'", 'F', "F'", 'B', "B'"];
    const sequence: MoveStep[] = [];
    for (let i = 0; i < 18; i++) {
      const randMove = moves[Math.floor(Math.random() * moves.length)];
      sequence.push(parseMove(randMove));
    }

    for (const step of sequence) {
      await executeMoveStep(step, 100);
    }
    setIsSolvingOrScrambling(false);
  }, [executeMoveStep, isSolvingOrScrambling, parseMove]);

  // Reset to solved state
  const handleReset = useCallback(async () => {
    if (!cubeRootRef.current) return;
    setIsSolvingOrScrambling(true);

    // Smoothly reset all cubies to initial positions
    const cubies = cubiesRef.current;
    cubies.forEach((c) => {
      c.mesh.position.copy(c.initialPos.clone().multiplyScalar(1.05));
      c.mesh.rotation.set(0, 0, 0);
      c.currentPos.copy(c.initialPos);
    });

    cubeAudio.playSolvedChime();
    setIsSolvingOrScrambling(false);
  }, []);

  // Reset Camera View
  const handleViewPreset = useCallback((preset = 'isometric') => {
    switch (preset) {
      case 'front':
        orbitRef.current.targetTheta = 0;
        orbitRef.current.targetPhi = Math.PI / 2;
        break;
      case 'top':
        orbitRef.current.targetTheta = 0;
        orbitRef.current.targetPhi = 0.05;
        break;
      case 'right':
        orbitRef.current.targetTheta = Math.PI / 2;
        orbitRef.current.targetPhi = Math.PI / 2;
        break;
      case 'back':
        orbitRef.current.targetTheta = Math.PI;
        orbitRef.current.targetPhi = Math.PI / 2;
        break;
      case 'left':
        orbitRef.current.targetTheta = -Math.PI / 2;
        orbitRef.current.targetPhi = Math.PI / 2;
        break;
      case 'isometric':
      default:
        orbitRef.current.targetTheta = Math.PI / 4;
        orbitRef.current.targetPhi = Math.PI / 3.2;
        break;
    }
  }, []);

  // Register parent callers
  useEffect(() => {
    if (registerMoveHandler) registerMoveHandler(handlePerformMove);
    if (registerScrambleHandler) registerScrambleHandler(handleScramble);
    if (registerResetHandler) registerResetHandler(handleReset);
    if (registerViewResetHandler) registerViewResetHandler(handleViewPreset);
  }, [
    registerMoveHandler,
    registerScrambleHandler,
    registerResetHandler,
    registerViewResetHandler,
    handlePerformMove,
    handleScramble,
    handleReset,
    handleViewPreset,
  ]);

  // Theme update (dark/white studio environment)
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const isDark = theme === 'dark';
    const bgColor = isDark ? 0x090d16 : 0xf8fafc;
    sceneRef.current.background = new THREE.Color(bgColor);

    if (ambientLightRef.current) {
      ambientLightRef.current.color = new THREE.Color(isDark ? 0x94a3b8 : 0xffffff);
      ambientLightRef.current.intensity = isDark ? 1.6 : 2.2;
    }

    if (dirLightRef.current) {
      dirLightRef.current.color = new THREE.Color(isDark ? 0xffffff : 0xfffbeb);
      dirLightRef.current.intensity = isDark ? 2.2 : 2.8;
    }
  }, [theme]);

  // Texture updates when config changes
  useEffect(() => {
    refreshStickers();
  }, [refreshStickers]);

  // Primary Three.js setup and render loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    const isDark = theme === 'dark';
    scene.background = new THREE.Color(isDark ? 0x090d16 : 0xf8fafc);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(isDark ? 0x94a3b8 : 0xffffff, isDark ? 1.6 : 2.2);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 2.2 : 2.8);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);
    dirLightRef.current = keyLight;

    // Rim Light (cool blue back highlight)
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    rimLight.position.set(-8, -6, -10);
    scene.add(rimLight);

    // Warm Fill Light
    const fillLight = new THREE.DirectionalLight(0xfef08a, 0.8);
    fillLight.position.set(-10, 8, 4);
    scene.add(fillLight);

    // Root Cube Group & Pivot
    const cubeRoot = new THREE.Group();
    scene.add(cubeRoot);
    cubeRootRef.current = cubeRoot;

    const pivotGroup = new THREE.Group();
    cubeRoot.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    // Base cubie geometry & material (speedcube black plastic)
    const cubieSize = 0.98;
    const cubieRadius = 0.08;
    const cubieGeo = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const cubieMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // sleek obsidian black speedcube plastic
      roughness: 0.35,
      metalness: 0.12,
    });

    // Thin sticker geometry placed on outer faces (fills the entire square)
    const stickerGeo = new THREE.PlaneGeometry(0.98, 0.98);

    const cubies: CubieData[] = [];

    // Create 27 cubies
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubieGroup = new THREE.Group();
          const baseMesh = new THREE.Mesh(cubieGeo, cubieMat);
          cubieGroup.add(baseMesh);

          // Position in 3D
          const spacing = 1.03;
          cubieGroup.position.set(x * spacing, y * spacing, z * spacing);

          const stickerMeshes = new Map<FaceName, { mesh: THREE.Mesh; row: number; col: number; face: FaceName }>();

          // Add stickers to outer faces
          const addSticker = (
            face: FaceName,
            pos: [number, number, number],
            rot: [number, number, number],
            row: number,
            col: number
          ) => {
            const stickerId = `${face}-${row}-${col}`;
            const sticker = config.stickers[stickerId];
            const faceColor = config.faceColors[face] || FACE_METAS[face].color;

            const texture = generateStickerTexture(sticker, faceColor, config.filterOpacity);
            const mat = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.25,
              metalness: 0.05,
              side: THREE.FrontSide,
            });

            const stMesh = new THREE.Mesh(stickerGeo, mat);
            stMesh.position.set(...pos);
            stMesh.rotation.set(...rot);
            stMesh.userData = { face, row, col, stickerId, isSticker: true };

            cubieGroup.add(stMesh);
            stickerMeshes.set(face, { mesh: stMesh, row, col, face });
          };

          // Right (+X)
          if (x === 1) {
            const { row, col } = getRowColForFace('right', x, y, z);
            addSticker('right', [cubieSize / 2 + 0.005, 0, 0], [0, Math.PI / 2, 0], row, col);
          }
          // Left (-X)
          if (x === -1) {
            const { row, col } = getRowColForFace('left', x, y, z);
            addSticker('left', [-cubieSize / 2 - 0.005, 0, 0], [0, -Math.PI / 2, 0], row, col);
          }
          // Up (+Y)
          if (y === 1) {
            const { row, col } = getRowColForFace('up', x, y, z);
            addSticker('up', [0, cubieSize / 2 + 0.005, 0], [-Math.PI / 2, 0, 0], row, col);
          }
          // Down (-Y)
          if (y === -1) {
            const { row, col } = getRowColForFace('down', x, y, z);
            addSticker('down', [0, -cubieSize / 2 - 0.005, 0], [Math.PI / 2, 0, 0], row, col);
          }
          // Front (+Z)
          if (z === 1) {
            const { row, col } = getRowColForFace('front', x, y, z);
            addSticker('front', [0, 0, cubieSize / 2 + 0.005], [0, 0, 0], row, col);
          }
          // Back (-Z)
          if (z === -1) {
            const { row, col } = getRowColForFace('back', x, y, z);
            addSticker('back', [0, 0, -cubieSize / 2 - 0.005], [0, Math.PI, 0], row, col);
          }

          cubeRoot.add(cubieGroup);

          cubies.push({
            mesh: cubieGroup,
            currentPos: new THREE.Vector3(x, y, z),
            initialPos: new THREE.Vector3(x, y, z),
            stickerMeshes,
          });
        }
      }
    }

    cubiesRef.current = cubies;

    // Resize listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Render Loop with damping for orbit
    let animationFrameId: number;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      // Smooth camera orbit interpolation
      const orbit = orbitRef.current;
      orbit.theta += (orbit.targetTheta - orbit.theta) * 0.12;
      orbit.phi += (orbit.targetPhi - orbit.phi) * 0.12;
      orbit.radius += (orbit.targetRadius - orbit.radius) * 0.12;

      // Restrict phi to avoid gimbal flip
      orbit.phi = Math.max(0.01, Math.min(Math.PI - 0.01, orbit.phi));

      const camX = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
      const camY = orbit.radius * Math.cos(orbit.phi);
      const camZ = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [theme, getRowColForFace]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isAnimatingMoveRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch zoom detection (e.g. mobile 2-finger zoom)
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      initialPinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchRadiusRef.current = orbitRef.current.targetRadius;
      isOrbitingRef.current = false;
      isDraggingSliceRef.current = false;
      activeHitRef.current = null;
      return;
    }

    isInteractingRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current!);

    // Check hit on stickers or cubies
    const objectsToTest: THREE.Object3D[] = [];
    cubiesRef.current.forEach((c) => {
      c.mesh.children.forEach((child) => {
        if (child.userData.isSticker) {
          objectsToTest.push(child);
        }
      });
    });

    const intersects = raycaster.intersectObjects(objectsToTest, false);

    if (intersects.length > 0 && e.button === 0) {
      const hitStickerMesh = intersects[0].object as THREE.Mesh;
      const { face, row, col, stickerId } = hitStickerMesh.userData;

      // Find cubie
      const hitCubie = cubiesRef.current.find((c) => c.mesh === hitStickerMesh.parent);

      if (hitCubie) {
        // Calculate world normal of face
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hitStickerMesh.matrixWorld);
        const worldNormal = new THREE.Vector3(0, 0, 1).applyMatrix3(normalMatrix).normalize();

        activeHitRef.current = {
          cubie: hitCubie,
          faceName: face,
          worldNormal,
          sticker: config.stickers[stickerId],
        };
        isDraggingSliceRef.current = false;
        isOrbitingRef.current = false;
        return;
      }
    }

    // Otherwise orbit the whole cube in 3D
    activeHitRef.current = null;
    isOrbitingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 2-finger touch pinch-to-zoom on mobile
    if (activePointersRef.current.size === 2 && initialPinchDistRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (curDist > 10) {
        const factor = initialPinchDistRef.current / curDist;
        orbitRef.current.targetRadius = Math.max(5.0, Math.min(22.0, initialPinchRadiusRef.current * factor));
      }
      return;
    }

    if (!isInteractingRef.current) return;

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const totalDx = e.clientX - pointerStartRef.current.x;
    const totalDy = e.clientY - pointerStartRef.current.y;
    const dist = Math.hypot(totalDx, totalDy);

    // 1. If currently dragging a slice
    if (activeSliceDragRef.current && pivotGroupRef.current) {
      const slice = activeSliceDragRef.current;
      // Project 2D mouse motion onto slice drag direction
      const mouseDelta = new THREE.Vector2(dx, dy);
      const dot = mouseDelta.dot(slice.screenDragDir);
      const angleChange = dot * 0.015;

      slice.accumulatedAngle += angleChange;

      if (slice.axis === 'x') pivotGroupRef.current.rotation.x = slice.accumulatedAngle;
      if (axisIsY(slice.axis)) pivotGroupRef.current.rotation.y = slice.accumulatedAngle;
      if (axisIsZ(slice.axis)) pivotGroupRef.current.rotation.z = slice.accumulatedAngle;

      return;
    }

    // 2. If hit a cubie and dragging exceeds threshold, initialize slice turn!
    if (activeHitRef.current && !isOrbitingRef.current && dist > 10 && !isDraggingSliceRef.current) {
      const { cubie, worldNormal } = activeHitRef.current;
      const camera = cameraRef.current!;

      // Determine the two primary tangent vectors perpendicular to face normal
      let tangent1 = new THREE.Vector3();
      let tangent2 = new THREE.Vector3();

      if (Math.abs(worldNormal.z) > 0.8) {
        // Front or Back face: tangents along X and Y
        tangent1.set(1, 0, 0);
        tangent2.set(0, 1, 0);
      } else if (Math.abs(worldNormal.y) > 0.8) {
        // Up or Down face: tangents along X and Z
        tangent1.set(1, 0, 0);
        tangent2.set(0, 0, 1);
      } else {
        // Right or Left face: tangents along Z and Y
        tangent1.set(0, 0, 1);
        tangent2.set(0, 1, 0);
      }

      // Project tangent vectors to 2D screen space
      const screenTan1 = projectVectorToScreen(tangent1, camera);
      const screenTan2 = projectVectorToScreen(tangent2, camera);

      const mouseDir = new THREE.Vector2(totalDx, totalDy).normalize();
      const dot1 = Math.abs(mouseDir.dot(screenTan1));
      const dot2 = Math.abs(mouseDir.dot(screenTan2));

      // Choose which axis rotation corresponds to the drag direction
      let chosenAxis: 'x' | 'y' | 'z' = 'y';
      let layerVal = 0;
      let screenDragDir = screenTan1;

      if (Math.abs(worldNormal.z) > 0.8) {
        // Dragging along X turns layer around Y; dragging along Y turns layer around X
        if (dot1 > dot2) {
          chosenAxis = 'y';
          layerVal = cubie.currentPos.y;
          screenDragDir = screenTan1;
        } else {
          chosenAxis = 'x';
          layerVal = cubie.currentPos.x;
          screenDragDir = screenTan2;
        }
      } else if (Math.abs(worldNormal.y) > 0.8) {
        // Up or Down face
        if (dot1 > dot2) {
          chosenAxis = 'z';
          layerVal = cubie.currentPos.z;
          screenDragDir = screenTan1;
        } else {
          chosenAxis = 'x';
          layerVal = cubie.currentPos.x;
          screenDragDir = screenTan2;
        }
      } else {
        // Right or Left face
        if (dot1 > dot2) {
          chosenAxis = 'y';
          layerVal = cubie.currentPos.y;
          screenDragDir = screenTan1;
        } else {
          chosenAxis = 'z';
          layerVal = cubie.currentPos.z;
          screenDragDir = screenTan2;
        }
      }

      // Collect the 9 cubies in this slice
      const targetCubies: CubieData[] = [];
      cubiesRef.current.forEach((c) => {
        if (Math.abs(c.currentPos[chosenAxis] - layerVal) < 0.45) {
          targetCubies.push(c);
        }
      });

      // Attach to pivot group
      const pivot = pivotGroupRef.current!;
      pivot.rotation.set(0, 0, 0);

      targetCubies.forEach((c) => {
        pivot.attach(c.mesh);
      });

      activeSliceDragRef.current = {
        axis: chosenAxis,
        layerValue: layerVal,
        screenDragDir,
        activeCubies: targetCubies,
        accumulatedAngle: 0,
        initialRotations: new Map(),
        initialPositions: new Map(),
      };

      isDraggingSliceRef.current = true;
      cubeAudio.playTurnSound();
      return;
    }

    // 3. Whole Cube 3D Orbit Drag
    if (isOrbitingRef.current || (!activeSliceDragRef.current && dist > 8)) {
      orbitRef.current.targetTheta += dx * 0.008;
      orbitRef.current.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitRef.current.targetPhi - dy * 0.008));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
    }

    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe
    }

    const totalDx = e.clientX - pointerStartRef.current.x;
    const totalDy = e.clientY - pointerStartRef.current.y;
    const dist = Math.hypot(totalDx, totalDy);
    const duration = performance.now() - pointerStartRef.current.time;

    // A. Check if it was a quick Click / Tap on a square!
    if (dist < 6 && duration < 380 && activeHitRef.current?.sticker) {
      cubeAudio.playClickSound();
      onStickerClick(activeHitRef.current.sticker);
      activeHitRef.current = null;
      return;
    }

    // B. Snap active slice drag to nearest 90 degrees
    if (activeSliceDragRef.current && pivotGroupRef.current) {
      const slice = activeSliceDragRef.current;
      const pivot = pivotGroupRef.current;
      const angle = slice.accumulatedAngle;
      const quarterTurn = Math.PI / 2;

      // Find nearest multiple of 90 degrees
      const snapUnits = Math.round(angle / quarterTurn);
      const targetSnapAngle = snapUnits * quarterTurn;

      const startTime = performance.now();
      const initialAngle = angle;
      const snapDuration = 180;

      const animateSnap = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / snapDuration);
        const ease = 1 - Math.pow(1 - progress, 2);
        const cur = initialAngle + (targetSnapAngle - initialAngle) * ease;

        if (slice.axis === 'x') pivot.rotation.x = cur;
        if (axisIsY(slice.axis)) pivot.rotation.y = cur;
        if (axisIsZ(slice.axis)) pivot.rotation.z = cur;

        if (progress < 1) {
          requestAnimationFrame(animateSnap);
        } else {
          // Snap finished
          if (slice.axis === 'x') pivot.rotation.x = targetSnapAngle;
          if (axisIsY(slice.axis)) pivot.rotation.y = targetSnapAngle;
          if (axisIsZ(slice.axis)) pivot.rotation.z = targetSnapAngle;

          pivot.updateMatrixWorld(true);

          if (snapUnits !== 0) {
            cubeAudio.playSnapSound();
            const rotMatrix = new THREE.Matrix4();
            if (slice.axis === 'x') rotMatrix.makeRotationX(targetSnapAngle);
            if (axisIsY(slice.axis)) rotMatrix.makeRotationY(targetSnapAngle);
            if (axisIsZ(slice.axis)) rotMatrix.makeRotationZ(targetSnapAngle);

            slice.activeCubies.forEach((c) => {
              cubeRootRef.current!.attach(c.mesh);
              c.currentPos.applyMatrix4(rotMatrix);
              c.currentPos.x = Math.round(c.currentPos.x);
              c.currentPos.y = Math.round(c.currentPos.y);
              c.currentPos.z = Math.round(c.currentPos.z);
            });
          } else {
            // Returned to 0, just detach
            slice.activeCubies.forEach((c) => {
              cubeRootRef.current!.attach(c.mesh);
            });
          }

          pivot.rotation.set(0, 0, 0);
          pivot.updateMatrixWorld(true);

          activeSliceDragRef.current = null;
          isDraggingSliceRef.current = false;
        }
      };

      requestAnimationFrame(animateSnap);
    }

    activeHitRef.current = null;
    isOrbitingRef.current = false;
  };

  // Wheel zoom (allows zooming in and out with scroll)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    orbitRef.current.targetRadius = Math.max(5.0, Math.min(22.0, orbitRef.current.targetRadius + e.deltaY * 0.007));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden touch-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
};

// Helper projection functions
function projectVectorToScreen(vec: THREE.Vector3, camera: THREE.Camera): THREE.Vector2 {
  const p0 = new THREE.Vector3(0, 0, 0).project(camera);
  const p1 = vec.clone().project(camera);
  return new THREE.Vector2(p1.x - p0.x, -(p1.y - p0.y)).normalize();
}

function axisIsY(axis: string): boolean {
  return axis === 'y';
}

function axisIsZ(axis: string): boolean {
  return axis === 'z';
}
