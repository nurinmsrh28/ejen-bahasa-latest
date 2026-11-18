import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CheckCircle2, Compass, RotateCcw, Search } from 'lucide-react';
import { LOCATIONS } from '../game/data';
import type { GameState, LocationId } from '../game/types';

export type CampusCameraMode = 'overview' | 'focus';

interface Phase1Campus3DProps {
  state: GameState;
  activeLocationId: LocationId;
  cameraMode: CampusCameraMode;
  activeClueId: string | null;
  resetSignal: number;
  onSelectLocation: (locId: LocationId, enterFocus?: boolean) => void;
  onSelectClue: (locId: LocationId, clueId: string) => void;
  onReturnOverview: () => void;
}

interface ZoneAnchorConfig {
  id: LocationId;
  code: string;
  position: [number, number, number];
  markerOffset: [number, number, number];
  cameraOffset: [number, number, number];
  targetOffset: [number, number, number];
  accentHex: number;
}

const ZONE_CONFIGS: Record<LocationId, ZoneAnchorConfig> = {
  kantin: {
    id: 'kantin',
    code: '01',
    position: [-9.2, 0, -7.2],
    markerOffset: [0, 5.2, 0],
    cameraOffset: [-2.2, 7.6, 5.2],
    targetOffset: [-9.2, 1.1, -7.2],
    accentHex: 0xe7b94f,
  },
  kelas: {
    id: 'kelas',
    code: '02',
    position: [-9.2, 0, 7.2],
    markerOffset: [0, 5.2, 0],
    cameraOffset: [-2.0, 7.8, 17.8],
    targetOffset: [-9.2, 1.1, 7.2],
    accentHex: 0x3b9d72,
  },
  perpustakaan: {
    id: 'perpustakaan',
    code: '03',
    position: [9.2, 0, -7.2],
    markerOffset: [0, 5.5, 0],
    cameraOffset: [16.2, 7.8, 4.8],
    targetOffset: [9.2, 1.2, -7.2],
    accentHex: 0x5288c9,
  },
  taman: {
    id: 'taman',
    code: '04',
    position: [9.2, 0, 7.2],
    markerOffset: [0, 4.8, 0],
    cameraOffset: [16.4, 7.4, 17.6],
    targetOffset: [9.2, 0.9, 7.2],
    accentHex: 0x62b85c,
  },
};

const OVERVIEW_CAM_POS = new THREE.Vector3(0.5, 22.5, 27.5);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.8, 0.5);

// Pre-allocated scratch math objects (zero allocations inside RAF tick)
const _projVec = new THREE.Vector3();
const _desiredCam = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return true;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const loseExt = gl.getExtension('WEBGL_lose_context');
    loseExt?.loseContext();
    return /SwiftShader|llvmpipe|WARP|Software/i.test(rendererStr);
  } catch {
    return true;
  }
}

interface ClueVisualRef {
  clueId: string;
  locationId: LocationId;
  hitMesh: THREE.Mesh;
  beaconGroup: THREE.Group;
  beaconMesh: THREE.Mesh;
  beaconRing: THREE.Mesh;
  baseY: number;
  phaseOffset: number;
}

export function Phase1Campus3D({
  state,
  activeLocationId,
  cameraMode,
  activeClueId,
  resetSignal,
  onSelectLocation,
  onSelectClue,
  onReturnOverview,
}: Phase1Campus3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<LocationId, HTMLButtonElement | null>>({
    kantin: null,
    kelas: null,
    perpustakaan: null,
    taman: null,
  });

  const [hoveredClueLabel, setHoveredClueLabel] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<LocationId | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // Latest React state mirrored into refs so the WebGL RAF loop never tears down
  const stateRef = useRef(state);
  stateRef.current = state;

  const activeLocRef = useRef(activeLocationId);
  activeLocRef.current = activeLocationId;

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  const activeClueRef = useRef(activeClueId);
  activeClueRef.current = activeClueId;

  const callbacksRef = useRef({ onSelectLocation, onSelectClue });
  callbacksRef.current = { onSelectLocation, onSelectClue };

  const cameraGlideRef = useRef<{ active: boolean; mode: CampusCameraMode; locId: LocationId }>({
    active: true,
    mode: cameraMode,
    locId: activeLocationId,
  });

  useEffect(() => {
    cameraGlideRef.current = {
      active: true,
      mode: cameraMode,
      locId: activeLocationId,
    };
  }, [cameraMode, activeLocationId, resetSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc2e6f7);
    scene.fog = new THREE.FogExp2(0xd6eef9, 0.0072);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.5, 160);
    camera.position.copy(OVERVIEW_CAM_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(OVERVIEW_TARGET);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.075;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.minPolarAngle = 0.28;
    controls.minDistance = 8.5;
    controls.maxDistance = 44;
    controls.panSpeed = 0.7;
    controls.rotateSpeed = 0.75;
    controls.update();

    const handleControlsStart = () => {
      cameraGlideRef.current.active = false;
    };
    controls.addEventListener('start', handleControlsStart);

    // Lighting: warm Malaysian morning sunlight + cool sky fill
    const hemiLight = new THREE.HemisphereLight(0xf3fbff, 0x4f7f56, 1.08);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff3d4, 2.2);
    sunLight.position.set(18, 28, 16);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 75;
      sunLight.shadow.camera.left = -24;
      sunLight.shadow.camera.right = 24;
      sunLight.shadow.camera.top = 24;
      sunLight.shadow.camera.bottom = -24;
      sunLight.shadow.bias = -0.0006;
    }
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xaadbf5, 0.45);
    fillLight.position.set(-16, 14, -14);
    scene.add(fillLight);

    // Disposal tracking lists
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    const makeStdMat = (
      color: number,
      roughness = 0.72,
      metalness = 0.04,
      emissive = 0x000000,
      emissiveIntensity = 0
    ) =>
      trackMat(
        new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness,
          emissive,
          emissiveIntensity,
        })
      );

    // Shared materials
    const grassMat = makeStdMat(0x5fa95f, 0.88, 0.0);
    const grassLightMat = makeStdMat(0x74be6c, 0.88, 0.0);
    const earthMat = makeStdMat(0x78563c, 0.92, 0.0);
    const stoneMat = makeStdMat(0xdfd6c1, 0.8, 0.04);
    const stoneTrimMat = makeStdMat(0xb9b09c, 0.82, 0.05);
    const pathMat = makeStdMat(0xe8dec5, 0.85, 0.02);
    const creamWallMat = makeStdMat(0xf5eedb, 0.76, 0.02);
    const forestTrimMat = makeStdMat(0x285643, 0.62, 0.08);
    const brassMat = makeStdMat(0xd5ac4e, 0.34, 0.65);
    const terracottaMat = makeStdMat(0xc86446, 0.7, 0.04);
    const woodMat = makeStdMat(0x8e5d38, 0.78, 0.03);
    const darkWoodMat = makeStdMat(0x593a22, 0.8, 0.04);
    const glassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xaadbf2,
        roughness: 0.14,
        metalness: 0.08,
        transmission: 0.35,
        transparent: true,
        opacity: 0.86,
      })
    );
    const waterMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x4ca9cf,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.88,
      })
    );

    const addBox = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      cast = true,
      receive = true
    ) => {
      const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = cast && !isSoftwareGl;
      mesh.receiveShadow = receive && !isSoftwareGl;
      parent.add(mesh);
      return mesh;
    };

    const addCyl = (
      parent: THREE.Object3D,
      rTop: number,
      rBot: number,
      h: number,
      segs: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const mesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(rTop, rBot, h, segs)), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      parent.add(mesh);
      return mesh;
    };

    // =========================================================================
    // 1. FLOATING SUNLIT CAMPUS TERRAIN & STONE WALKWAYS
    // =========================================================================
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Floating Island Strata
    addBox(worldGroup, 35, 1.2, 31, grassMat, 0, -0.6, 0, false, true);
    addBox(worldGroup, 34.4, 2.2, 30.4, earthMat, 0, -2.3, 0, false, false);
    addBox(worldGroup, 32.0, 1.4, 28.0, makeStdMat(0x5b402c, 0.94, 0), 0, -4.1, 0, false, false);

    // Subtle grass lawn quadrant highlights
    addBox(worldGroup, 12.5, 0.08, 10.5, grassLightMat, -9.2, 0.02, -7.2, false, true);
    addBox(worldGroup, 12.5, 0.08, 10.5, grassLightMat, -9.2, 0.02, 7.2, false, true);
    addBox(worldGroup, 12.5, 0.08, 10.5, grassLightMat, 9.2, 0.02, -7.2, false, true);
    addBox(worldGroup, 12.5, 0.08, 10.5, grassLightMat, 9.2, 0.02, 7.2, false, true);

    // Central Plaza Octagon / Disk
    addCyl(worldGroup, 4.8, 5.1, 0.22, 16, stoneMat, 0, 0.11, 0);
    addCyl(worldGroup, 4.1, 4.1, 0.25, 16, stoneTrimMat, 0, 0.13, 0);
    addCyl(worldGroup, 3.6, 3.6, 0.27, 16, creamWallMat, 0, 0.14, 0);

    // Main Cross & Diagonal Walkways connecting all 4 sectors
    addBox(worldGroup, 2.4, 0.12, 26.5, pathMat, 0, 0.06, 0, false, true);
    addBox(worldGroup, 26.5, 0.12, 2.4, pathMat, 0, 0.06, 0, false, true);
    addBox(worldGroup, 8.8, 0.11, 1.8, pathMat, -4.8, 0.06, -7.2, false, true);
    addBox(worldGroup, 8.8, 0.11, 1.8, pathMat, 4.8, 0.06, -7.2, false, true);
    addBox(worldGroup, 8.8, 0.11, 1.8, pathMat, -4.8, 0.06, 7.2, false, true);
    addBox(worldGroup, 8.8, 0.11, 1.8, pathMat, 4.8, 0.06, 7.2, false, true);

    // =========================================================================
    // 2. CENTRAL CLOCK TOWER & EJEN BAHASA COMPASS PLAZA
    // =========================================================================
    const plazaGroup = new THREE.Group();
    plazaGroup.position.set(0, 0.27, 0);
    worldGroup.add(plazaGroup);

    addBox(plazaGroup, 2.2, 0.5, 2.2, stoneTrimMat, 0, 0.25, 0);
    addBox(plazaGroup, 1.6, 3.4, 1.6, creamWallMat, 0, 2.2, 0);
    addBox(plazaGroup, 1.78, 0.22, 1.78, forestTrimMat, 0, 3.9, 0);
    // Clock dials on 4 sides
    addCyl(plazaGroup, 0.42, 0.42, 1.68, 16, brassMat, 0, 3.15, 0).rotation.x = Math.PI / 2;
    addCyl(plazaGroup, 0.42, 0.42, 1.68, 16, brassMat, 0, 3.15, 0).rotation.z = Math.PI / 2;
    // Pyramid spire
    const spire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.35, 1.85, 4)),
      forestTrimMat
    );
    spire.position.set(0, 4.92, 0);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = !isSoftwareGl;
    plazaGroup.add(spire);

    // Rotating golden compass halo at clock tower apex
    const compassHalo = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.75, 0.07, 10, 28)),
      brassMat
    );
    compassHalo.position.set(0, 6.15, 0);
    plazaGroup.add(compassHalo);

    // South entrance archway (Sekolah Seri Bestari)
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0.12, 13.6);
    worldGroup.add(gateGroup);
    addBox(gateGroup, 0.55, 2.6, 0.55, creamWallMat, -2.0, 1.3, 0);
    addBox(gateGroup, 0.55, 2.6, 0.55, creamWallMat, 2.0, 1.3, 0);
    addBox(gateGroup, 5.2, 0.65, 0.72, forestTrimMat, 0, 2.75, 0);
    addBox(gateGroup, 4.6, 0.2, 0.8, brassMat, 0, 3.1, 0);

    // Soft floating stylized clouds around the sky
    const cloudMat = makeStdMat(0xffffff, 0.9, 0.0);
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    const cloudSeeds = [
      [-18, 13, -15, 1.2],
      [16, 15, -14, 1.0],
      [-19, 14, 10, 0.9],
      [20, 13, 8, 1.15],
    ];
    cloudSeeds.forEach(([cx, cy, cz, sc]) => {
      const c = new THREE.Group();
      c.position.set(cx, cy, cz);
      c.scale.setScalar(sc);
      const puff1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.3, 12, 10)), cloudMat);
      const puff2 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.95, 12, 10)), cloudMat);
      puff2.position.set(1.15, -0.25, 0.2);
      const puff3 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.9, 12, 10)), cloudMat);
      puff3.position.set(-1.1, -0.3, -0.15);
      c.add(puff1, puff2, puff3);
      cloudGroup.add(c);
    });

    // =========================================================================
    // 3. INSTANCED LOW-POLY CAMPUS TREES
    // =========================================================================
    const treePositions: [number, number, number, number][] = [
      [-15.2, 0, -13.0, 1.15],
      [-15.6, 0, -2.2, 0.95],
      [-15.4, 0, 12.6, 1.1],
      [-4.2, 0, -13.2, 1.0],
      [4.2, 0, -13.2, 1.05],
      [15.4, 0, -12.8, 1.15],
      [15.6, 0, -2.0, 0.95],
      [15.2, 0, 12.8, 1.2],
      [-4.5, 0, 13.0, 0.9],
      [4.5, 0, 13.0, 0.95],
      [-2.8, 0, -4.0, 0.85],
      [2.8, 0, -4.0, 0.85],
      [-2.8, 0, 4.0, 0.85],
      [2.8, 0, 4.0, 0.85],
      [-14.6, 0, 2.4, 1.0],
      [14.6, 0, 2.4, 1.0],
    ];

    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 8));
    const trunkMat = makeStdMat(0x7c5334, 0.9, 0.0);
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    trunkInst.castShadow = !isSoftwareGl;

    const canopyGeo = trackGeo(new THREE.IcosahedronGeometry(1.05, 1));
    const canopyMat = makeStdMat(0x3f8f4f, 0.82, 0.0);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    canopyInst.castShadow = !isSoftwareGl;
    canopyInst.receiveShadow = !isSoftwareGl;

    const canopyTopGeo = trackGeo(new THREE.IcosahedronGeometry(0.76, 1));
    const canopyTopMat = makeStdMat(0x5bb262, 0.82, 0.0);
    const canopyTopInst = new THREE.InstancedMesh(
      canopyTopGeo,
      canopyTopMat,
      treePositions.length
    );
    canopyTopInst.castShadow = !isSoftwareGl;

    const dummy = new THREE.Object3D();
    treePositions.forEach(([tx, ty, tz, s], idx) => {
      dummy.position.set(tx, ty + 0.65 * s, tz);
      dummy.scale.set(s, s, s);
      dummy.rotation.y = idx * 0.8;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, ty + 1.85 * s, tz);
      dummy.scale.set(s, s * 1.05, s);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx + 0.12 * s, ty + 2.65 * s, tz - 0.08 * s);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      canopyTopInst.setMatrixAt(idx, dummy.matrix);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    canopyTopInst.instanceMatrix.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    canopyTopInst.computeBoundingSphere();
    worldGroup.add(trunkInst, canopyInst, canopyTopInst);

    // =========================================================================
    // 4. INTERACTIVE ZONE HITBOXES & CLUE HELPERS
    // =========================================================================
    const zoneHitMeshes: THREE.Mesh[] = [];
    const clueVisuals: ClueVisualRef[] = [];
    const zoneRingMeshes: Record<LocationId, THREE.Mesh> = {} as Record<LocationId, THREE.Mesh>;

    const createZoneHitBase = (locId: LocationId, pos: [number, number, number], accentHex: number) => {
      const group = new THREE.Group();
      group.position.set(pos[0], pos[1], pos[2]);
      worldGroup.add(group);

      // Stone terrace pad
      addBox(group, 8.6, 0.24, 7.2, stoneMat, 0, 0.12, 0, false, true);

      // Subtle glowing perimeter highlight strip around active/hovered zone
      const ringGeo = trackGeo(new THREE.RingGeometry(4.65, 4.95, 32));
      const ringMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: accentHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.32,
        })
      );
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      group.add(ring);
      zoneRingMeshes[locId] = ring;

      // Invisible clickable zone volume for overview click
      const hitMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(8.8, 4.2, 7.4)),
        trackMat(new THREE.MeshBasicMaterial({ visible: false }))
      );
      hitMesh.position.set(0, 2.1, 0);
      hitMesh.userData = { zoneId: locId };
      group.add(hitMesh);
      zoneHitMeshes.push(hitMesh);

      return group;
    };

    const attachClueBeaconAndHit = (
      parent: THREE.Object3D,
      locationId: LocationId,
      clueId: string,
      x: number,
      y: number,
      z: number,
      hitSize: [number, number, number],
      phaseOffset: number
    ) => {
      const hitMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(hitSize[0], hitSize[1], hitSize[2])),
        trackMat(new THREE.MeshBasicMaterial({ visible: false }))
      );
      hitMesh.position.set(x, y + hitSize[1] * 0.4, z);
      hitMesh.userData = { clueId, locationId };
      parent.add(hitMesh);

      const beaconGroup = new THREE.Group();
      const baseY = y + hitSize[1] + 0.72;
      beaconGroup.position.set(x, baseY, z);
      parent.add(beaconGroup);

      const diamond = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xf4c44e,
            emissive: 0xd99b26,
            emissiveIntensity: 0.55,
            roughness: 0.28,
            metalness: 0.35,
          })
        )
      );
      beaconGroup.add(diamond);

      const ring = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.42, 0.045, 8, 20)),
        trackMat(
          new THREE.MeshBasicMaterial({
            color: 0xf4c44e,
            transparent: true,
            opacity: 0.85,
          })
        )
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.34;
      beaconGroup.add(ring);

      clueVisuals.push({
        clueId,
        locationId,
        hitMesh,
        beaconGroup,
        beaconMesh: diamond,
        beaconRing: ring,
        baseY,
        phaseOffset,
      });
    };

    // -------------------------------------------------------------------------
    // ZONE 01: KANTIN CERIA (Back-Left)
    // -------------------------------------------------------------------------
    const kantinGroup = createZoneHitBase('kantin', ZONE_CONFIGS.kantin.position, ZONE_CONFIGS.kantin.accentHex);
    // Open-front pavilion: back wall, side stall, checkered floor, striped awning
    addBox(kantinGroup, 7.6, 0.06, 6.0, creamWallMat, 0, 0.27, 0, false, true);
    addBox(kantinGroup, 7.6, 2.8, 0.35, creamWallMat, 0, 1.64, -2.85);
    addBox(kantinGroup, 0.35, 2.8, 3.0, creamWallMat, -3.62, 1.64, -1.5);
    // Counter & stainless food warmers
    addBox(kantinGroup, 4.8, 0.95, 0.95, terracottaMat, -0.8, 0.72, -1.9);
    addBox(kantinGroup, 4.9, 0.12, 1.05, stoneMat, -0.8, 1.24, -1.9);
    // Front pillars & cutaway roof canopy
    addCyl(kantinGroup, 0.14, 0.14, 2.8, 10, forestTrimMat, -3.55, 1.64, 2.6);
    addCyl(kantinGroup, 0.14, 0.14, 2.8, 10, forestTrimMat, 3.55, 1.64, 2.6);
    addBox(kantinGroup, 8.2, 0.24, 6.4, terracottaMat, 0, 3.16, -0.1);
    addBox(kantinGroup, 8.4, 0.14, 0.85, brassMat, 0, 3.0, 2.95);
    // Dining tables (3 tables)
    addBox(kantinGroup, 1.8, 0.08, 0.95, stoneMat, -1.8, 0.92, 1.15);
    addBox(kantinGroup, 0.18, 0.65, 0.7, darkWoodMat, -1.8, 0.57, 1.15);
    addBox(kantinGroup, 1.8, 0.08, 0.95, stoneMat, 0.9, 0.92, 0.85);
    addBox(kantinGroup, 0.18, 0.65, 0.7, darkWoodMat, 0.9, 0.57, 0.85);

    // Clue 1: kantin_sampah (scattered wrappers on floor front-left)
    const trashCluster = new THREE.Group();
    trashCluster.position.set(-2.0, 0.3, 2.05);
    kantinGroup.add(trashCluster);
    addBox(trashCluster, 0.35, 0.1, 0.28, makeStdMat(0xffffff), -0.25, 0.05, 0.1);
    addBox(trashCluster, 0.3, 0.14, 0.24, makeStdMat(0xeb7844), 0.22, 0.07, -0.12);
    addCyl(trashCluster, 0.11, 0.08, 0.22, 8, makeStdMat(0x63b4d1), 0.0, 0.11, 0.18);
    attachClueBeaconAndHit(kantinGroup, 'kantin', 'kantin_sampah', -2.0, 0.3, 2.05, [1.4, 1.1, 1.4], 0.2);

    // Clue 2: kantin_meja (leftover plates & spilled cups on central dining table)
    const messyPlates = new THREE.Group();
    messyPlates.position.set(0.9, 0.96, 0.85);
    kantinGroup.add(messyPlates);
    addCyl(messyPlates, 0.22, 0.18, 0.06, 12, makeStdMat(0xfdfbf7), -0.36, 0.03, 0.1);
    addCyl(messyPlates, 0.2, 0.16, 0.06, 12, makeStdMat(0xe68443), 0.32, 0.03, -0.1);
    addCyl(messyPlates, 0.09, 0.07, 0.24, 10, makeStdMat(0x52a8d8), 0.05, 0.12, 0.16);
    attachClueBeaconAndHit(kantinGroup, 'kantin', 'kantin_meja', 0.9, 0.92, 0.85, [1.7, 1.1, 1.2], 1.1);

    // Clue 3: kantin_tong (overflowing rubbish bin right corner)
    const binGroup = new THREE.Group();
    binGroup.position.set(3.0, 0.3, 1.1);
    kantinGroup.add(binGroup);
    addCyl(binGroup, 0.4, 0.32, 0.92, 12, makeStdMat(0x2d6d4e), 0, 0.46, 0);
    addBox(binGroup, 0.44, 0.35, 0.36, makeStdMat(0xd96e4b), 0.05, 0.98, 0.02);
    addBox(binGroup, 0.28, 0.18, 0.28, makeStdMat(0xf6f1e0), -0.35, 0.1, 0.4);
    attachClueBeaconAndHit(kantinGroup, 'kantin', 'kantin_tong', 3.0, 0.3, 1.1, [1.4, 1.4, 1.4], 2.0);

    // -------------------------------------------------------------------------
    // ZONE 02: KELAS HARMONI (Front-Left)
    // -------------------------------------------------------------------------
    const kelasGroup = createZoneHitBase('kelas', ZONE_CONFIGS.kelas.position, ZONE_CONFIGS.kelas.accentHex);
    addBox(kelasGroup, 7.6, 0.06, 6.0, stoneMat, 0, 0.27, 0, false, true);
    // Back & left cutaway classroom walls
    addBox(kelasGroup, 7.6, 2.9, 0.32, creamWallMat, 0, 1.7, -2.85);
    addBox(kelasGroup, 0.32, 2.9, 5.8, creamWallMat, -3.65, 1.7, -0.05);
    // Window cutouts on left wall + top terracotta trim
    addBox(kelasGroup, 0.38, 1.1, 2.6, glassMat, -3.65, 1.85, 0.2, false, false);
    addBox(kelasGroup, 7.9, 0.22, 0.65, forestTrimMat, 0, 3.2, -2.85);
    addBox(kelasGroup, 0.65, 0.22, 6.1, forestTrimMat, -3.65, 3.2, 0);
    // Whiteboard at front-left wall
    addBox(kelasGroup, 3.2, 1.25, 0.12, makeStdMat(0x1f5942), -1.3, 1.85, -2.62);
    addBox(kelasGroup, 3.36, 1.38, 0.06, woodMat, -1.3, 1.85, -2.66);

    // Clue 1: kelas_meja (crooked/messy desks & chair)
    const messyDesks = new THREE.Group();
    messyDesks.position.set(-1.35, 0.3, 0.85);
    kelasGroup.add(messyDesks);
    const desk1 = addBox(messyDesks, 1.15, 0.68, 0.68, woodMat, -0.5, 0.34, -0.15);
    desk1.rotation.y = 0.28;
    const desk2 = addBox(messyDesks, 1.15, 0.68, 0.68, woodMat, 0.85, 0.34, 0.22);
    desk2.rotation.y = -0.35;
    const tippedChair = addBox(messyDesks, 0.48, 0.55, 0.48, makeStdMat(0x3a6f8f), 0.1, 0.28, 0.72);
    tippedChair.rotation.z = 0.42;
    attachClueBeaconAndHit(kelasGroup, 'kelas', 'kelas_meja', -1.35, 0.3, 0.85, [2.2, 1.2, 1.8], 0.5);

    // Clue 2: kelas_sudut (faded/skewed rear learning board)
    const learningBoard = new THREE.Group();
    learningBoard.position.set(2.2, 1.75, -2.6);
    kelasGroup.add(learningBoard);
    const boardBacking = addBox(learningBoard, 1.8, 1.25, 0.1, makeStdMat(0xc5b89a), 0, 0, 0);
    boardBacking.rotation.z = -0.09;
    addBox(learningBoard, 0.52, 0.42, 0.14, makeStdMat(0xe2c87b), -0.42, 0.15, 0.02);
    attachClueBeaconAndHit(kelasGroup, 'kelas', 'kelas_sudut', 2.2, 1.15, -2.5, [1.9, 1.5, 0.9], 1.4);

    // Clue 3: kelas_bahan (messy books & supplies shelf on right)
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(2.6, 0.3, 1.1);
    kelasGroup.add(shelfGroup);
    addBox(shelfGroup, 1.4, 1.3, 0.62, darkWoodMat, 0, 0.65, 0);
    addBox(shelfGroup, 0.42, 0.32, 0.32, makeStdMat(0xd9614a), -0.3, 1.46, 0.05).rotation.y = 0.3;
    addBox(shelfGroup, 0.44, 0.24, 0.36, makeStdMat(0x5288c9), 0.28, 1.42, -0.06).rotation.y = -0.25;
    addBox(shelfGroup, 0.5, 0.14, 0.38, makeStdMat(0xf4eee0), -0.1, 0.07, 0.56);
    attachClueBeaconAndHit(kelasGroup, 'kelas', 'kelas_bahan', 2.6, 0.3, 1.1, [1.7, 1.6, 1.4], 2.3);

    // -------------------------------------------------------------------------
    // ZONE 03: PERPUSTAKAAN ILMU (Back-Right)
    // -------------------------------------------------------------------------
    const perpusGroup = createZoneHitBase(
      'perpustakaan',
      ZONE_CONFIGS.perpustakaan.position,
      ZONE_CONFIGS.perpustakaan.accentHex
    );
    addBox(perpusGroup, 7.6, 0.06, 6.0, makeStdMat(0xcbb38b), 0, 0.27, 0, false, true);
    // Warm brick/cream walls with tall windows
    addBox(perpusGroup, 7.6, 3.1, 0.32, creamWallMat, 0, 1.8, -2.85);
    addBox(perpusGroup, 0.32, 3.1, 5.8, creamWallMat, 3.65, 1.8, -0.05);
    addBox(perpusGroup, 2.2, 1.6, 0.38, glassMat, -1.8, 1.9, -2.85, false, false);
    addBox(perpusGroup, 2.2, 1.6, 0.38, glassMat, 1.6, 1.9, -2.85, false, false);
    addBox(perpusGroup, 8.0, 0.25, 0.72, makeStdMat(0x284e68), 0, 3.4, -2.85);
    addBox(perpusGroup, 0.72, 0.25, 6.1, makeStdMat(0x284e68), 3.65, 3.4, 0);

    // Clue 1: perpus_buku (unsorted towering books & crooked bookcase on left)
    const bookZone = new THREE.Group();
    bookZone.position.set(-2.3, 0.3, -1.2);
    perpusGroup.add(bookZone);
    addBox(bookZone, 1.9, 2.2, 0.65, darkWoodMat, 0, 1.1, 0);
    addBox(bookZone, 0.45, 0.4, 0.35, makeStdMat(0xd65d48), -0.45, 1.35, 0.1).rotation.z = 0.35;
    addBox(bookZone, 0.5, 0.25, 0.38, makeStdMat(0x5288c9), 0.1, 0.13, 0.55);
    addBox(bookZone, 0.44, 0.22, 0.34, makeStdMat(0xe7b94f), 0.14, 0.36, 0.52).rotation.y = 0.25;
    attachClueBeaconAndHit(perpusGroup, 'perpustakaan', 'perpus_buku', -2.3, 0.3, -1.2, [2.1, 2.3, 1.5], 0.8);

    // Clue 2: perpus_selesa (narrow table, stiff hard stools, dim lamp center)
    const studySet = new THREE.Group();
    studySet.position.set(0.25, 0.3, 0.75);
    perpusGroup.add(studySet);
    addBox(studySet, 1.65, 0.74, 0.85, woodMat, 0, 0.37, 0);
    addBox(studySet, 0.42, 0.48, 0.42, darkWoodMat, -0.5, 0.24, 0.7);
    addBox(studySet, 0.42, 0.48, 0.42, darkWoodMat, 0.5, 0.24, 0.7);
    addCyl(studySet, 0.08, 0.15, 0.42, 8, brassMat, 0.45, 0.95, 0);
    attachClueBeaconAndHit(perpusGroup, 'perpustakaan', 'perpus_selesa', 0.25, 0.3, 0.75, [1.8, 1.3, 1.6], 1.7);

    // Clue 3: perpus_sudut (reading rug cluttered with stacked cardboard boxes right-front)
    const boxCorner = new THREE.Group();
    boxCorner.position.set(2.35, 0.3, 1.35);
    perpusGroup.add(boxCorner);
    addBox(boxCorner, 2.0, 0.04, 1.75, makeStdMat(0x88b498), 0, 0.02, 0, false, true);
    addBox(boxCorner, 0.72, 0.58, 0.68, makeStdMat(0xc49a6c), -0.32, 0.3, -0.1);
    addBox(boxCorner, 0.68, 0.54, 0.64, makeStdMat(0xb38759), 0.38, 0.28, 0.22).rotation.y = 0.25;
    addBox(boxCorner, 0.54, 0.46, 0.52, makeStdMat(0xcba478), -0.22, 0.82, -0.05);
    attachClueBeaconAndHit(perpusGroup, 'perpustakaan', 'perpus_sudut', 2.35, 0.3, 1.35, [2.0, 1.3, 1.8], 2.5);

    // -------------------------------------------------------------------------
    // ZONE 04: TAMAN REKREASI (Front-Right)
    // -------------------------------------------------------------------------
    const tamanGroup = createZoneHitBase('taman', ZONE_CONFIGS.taman.position, ZONE_CONFIGS.taman.accentHex);
    // Decorative pond & wooden pergola arch
    addCyl(tamanGroup, 1.45, 1.55, 0.22, 16, stoneTrimMat, -2.5, 0.25, -1.5);
    addCyl(tamanGroup, 1.2, 1.2, 0.25, 16, waterMat, -2.5, 0.26, -1.5);
    // Pergola beams
    addBox(tamanGroup, 0.24, 2.7, 0.24, woodMat, -1.3, 1.5, -2.4);
    addBox(tamanGroup, 0.24, 2.7, 0.24, woodMat, 1.3, 1.5, -2.4);
    addBox(tamanGroup, 3.2, 0.22, 0.32, woodMat, 0, 2.85, -2.4);
    addBox(tamanGroup, 3.2, 0.16, 0.26, woodMat, 0, 2.85, -1.8);

    // Clue 1: taman_tumbuhan (dry/wilted flowerbed front-left)
    const wiltedBed = new THREE.Group();
    wiltedBed.position.set(-2.0, 0.3, 1.35);
    tamanGroup.add(wiltedBed);
    addBox(wiltedBed, 2.2, 0.34, 1.25, stoneTrimMat, 0, 0.17, 0);
    addBox(wiltedBed, 1.95, 0.36, 1.0, makeStdMat(0x8c704c), 0, 0.19, 0);
    // Drooping yellowish stems
    const wilt1 = addCyl(wiltedBed, 0.08, 0.04, 0.55, 7, makeStdMat(0x9b8e46), -0.5, 0.55, 0.1);
    wilt1.rotation.z = 0.52;
    const wilt2 = addCyl(wiltedBed, 0.08, 0.04, 0.48, 7, makeStdMat(0x887d3e), 0.3, 0.52, -0.15);
    wilt2.rotation.z = -0.45;
    attachClueBeaconAndHit(tamanGroup, 'taman', 'taman_tumbuhan', -2.0, 0.3, 1.35, [2.2, 1.1, 1.5], 0.4);

    // Clue 2: taman_kawasan (bare muddy patch + crooked empty signpost center)
    const barePatch = new THREE.Group();
    barePatch.position.set(0.35, 0.26, -0.35);
    tamanGroup.add(barePatch);
    addCyl(barePatch, 1.35, 1.35, 0.08, 14, makeStdMat(0x9d8662), 0, 0.04, 0);
    const crookedPost = addBox(barePatch, 0.12, 1.15, 0.12, darkWoodMat, 0.45, 0.58, -0.35);
    crookedPost.rotation.z = 0.18;
    const signBoard = addBox(barePatch, 0.72, 0.46, 0.08, makeStdMat(0xcbbda2), 0.38, 1.02, -0.35);
    signBoard.rotation.z = 0.18;
    attachClueBeaconAndHit(tamanGroup, 'taman', 'taman_kawasan', 0.35, 0.26, -0.35, [2.1, 1.4, 2.0], 1.3);

    // Clue 3: taman_duduk (broken/missing bench stone pad right)
    const brokenBench = new THREE.Group();
    brokenBench.position.set(2.5, 0.3, 1.25);
    tamanGroup.add(brokenBench);
    addBox(brokenBench, 1.85, 0.12, 0.95, stoneTrimMat, 0, 0.06, 0);
    addBox(brokenBench, 0.22, 0.38, 0.52, stoneMat, -0.62, 0.25, 0);
    addBox(brokenBench, 0.22, 0.38, 0.52, stoneMat, 0.62, 0.25, 0);
    const snappedPlank = addBox(brokenBench, 0.85, 0.08, 0.45, woodMat, -0.25, 0.44, 0.05);
    snappedPlank.rotation.z = -0.22;
    attachClueBeaconAndHit(tamanGroup, 'taman', 'taman_duduk', 2.5, 0.3, 1.25, [1.9, 1.0, 1.4], 2.2);

    // =========================================================================
    // 5. RAYCASTING (POINTER CLICK & HOVER)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const getHitTarget = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const clueMeshes = clueVisuals.map((c) => c.hitMesh);
      const clueHits = raycaster.intersectObjects(clueMeshes, false);
      if (clueHits.length > 0) {
        const hitData = clueHits[0].object.userData as { clueId: string; locationId: LocationId };
        // In overview mode, allow direct clue clicks or prioritize zone focus if clicking far building
        if (cameraModeRef.current === 'focus' || hitData.locationId === activeLocRef.current) {
          return { type: 'clue' as const, locationId: hitData.locationId, clueId: hitData.clueId };
        }
      }

      const zoneHits = raycaster.intersectObjects(zoneHitMeshes, false);
      if (zoneHits.length > 0) {
        const zoneId = zoneHits[0].object.userData.zoneId as LocationId;
        return { type: 'zone' as const, locationId: zoneId };
      }

      // Fallback check clues even in overview if directly clicked
      if (clueHits.length > 0) {
        const hitData = clueHits[0].object.userData as { clueId: string; locationId: LocationId };
        return { type: 'clue' as const, locationId: hitData.locationId, clueId: hitData.clueId };
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const hit = getHitTarget(e.clientX, e.clientY);
      if (hit?.type === 'clue') {
        const loc = LOCATIONS.find((l) => l.id === hit.locationId);
        const clue = loc?.clues.find((c) => c.id === hit.clueId);
        renderer.domElement.style.cursor = 'pointer';
        setHoveredClueLabel(clue?.label || 'Periksa Bukti');
        setHoveredZoneId(hit.locationId);
      } else if (hit?.type === 'zone') {
        renderer.domElement.style.cursor = 'pointer';
        setHoveredClueLabel(null);
        setHoveredZoneId(hit.locationId);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredClueLabel(null);
        setHoveredZoneId(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 8) return; // Was an orbit drag, not a click
      const hit = getHitTarget(e.clientX, e.clientY);
      if (!hit) return;

      if (hit.type === 'clue') {
        callbacksRef.current.onSelectLocation(hit.locationId, true);
        callbacksRef.current.onSelectClue(hit.locationId, hit.clueId);
      } else if (hit.type === 'zone') {
        callbacksRef.current.onSelectLocation(hit.locationId, true);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // =========================================================================
    // 6. RESIZE & WEBGL CONTEXT LOST HANDLING
    // =========================================================================
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    // =========================================================================
    // 7. ANIMATION LOOP + SOFTWARE GL FENCESYNC PACING + MARKER PROJECTION
    // =========================================================================
    const clock = new THREE.Clock();
    let rafId = 0;
    let isDisposed = false;

    const afterDraw = (done: () => void) => {
      if (!isSoftwareGl) {
        rafId = requestAnimationFrame(done);
        return;
      }
      const gl = renderer.getContext();
      if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl.flush();
          const start = performance.now();
          const poll = () => {
            if (isDisposed) {
              gl.deleteSync(sync);
              return;
            }
            const status = gl.clientWaitSync(sync, 0, 0);
            if (status !== gl.TIMEOUT_EXPIRED || performance.now() - start > 80) {
              gl.deleteSync(sync);
              rafId = requestAnimationFrame(done);
            } else {
              setTimeout(poll, 16);
            }
          };
          poll();
          return;
        }
      }
      rafId = requestAnimationFrame(done);
    };

    const tick = () => {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Rotate central golden compass ring & gently drift clouds
      compassHalo.rotation.y = elapsed * 0.55;
      cloudGroup.children.forEach((cloud, i) => {
        cloud.position.x += Math.sin(elapsed * 0.16 + i) * 0.004;
      });

      // Smooth damped camera glide toward selected mode/location
      const glide = cameraGlideRef.current;
      if (glide.active) {
        if (glide.mode === 'overview') {
          _desiredCam.copy(OVERVIEW_CAM_POS);
          _desiredTarget.copy(OVERVIEW_TARGET);
        } else {
          const zCfg = ZONE_CONFIGS[glide.locId];
          _desiredCam.set(zCfg.cameraOffset[0], zCfg.cameraOffset[1], zCfg.cameraOffset[2]);
          _desiredTarget.set(zCfg.targetOffset[0], zCfg.targetOffset[1], zCfg.targetOffset[2]);
        }
        const lambda = 4.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredCam.x, lambda, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredCam.y, lambda, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredCam.z, lambda, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _desiredTarget.x, lambda, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _desiredTarget.y, lambda, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _desiredTarget.z, lambda, dt);

        if (
          camera.position.distanceToSquared(_desiredCam) < 0.01 &&
          controls.target.distanceToSquared(_desiredTarget) < 0.01
        ) {
          glide.active = false;
        }
      }

      controls.update();

      // Update clue beacons based on current GameState & hintLevelUsed
      const curState = stateRef.current;
      const curActiveLoc = activeLocRef.current;
      const curActiveClue = activeClueRef.current;

      for (let i = 0; i < clueVisuals.length; i++) {
        const cv = clueVisuals[i];
        const inv = curState.investigations[cv.locationId];
        const discovered = inv.discoveredClueIds.includes(cv.clueId);
        const showSpotlight = inv.hintLevelUsed >= 3 && !discovered;
        const isSelected = curActiveClue === cv.clueId;

        const beaconMat = cv.beaconMesh.material as THREE.MeshStandardMaterial;
        const ringMat = cv.beaconRing.material as THREE.MeshBasicMaterial;

        if (discovered) {
          beaconMat.color.setHex(0x38b47c);
          beaconMat.emissive.setHex(0x1f6b47);
          beaconMat.emissiveIntensity = isSelected ? 0.8 : 0.35;
          ringMat.color.setHex(0x38b47c);
          ringMat.opacity = isSelected ? 0.95 : 0.45;
          cv.beaconGroup.position.y = cv.baseY + Math.sin(elapsed * 1.6 + cv.phaseOffset) * 0.06;
          cv.beaconGroup.scale.setScalar(isSelected ? 1.15 : 0.82);
        } else if (showSpotlight) {
          beaconMat.color.setHex(0xe0523c);
          beaconMat.emissive.setHex(0xc23824);
          beaconMat.emissiveIntensity = 0.85;
          ringMat.color.setHex(0xe0523c);
          ringMat.opacity = 0.95;
          const pulse = 1.12 + Math.sin(elapsed * 4.2 + cv.phaseOffset) * 0.16;
          cv.beaconGroup.scale.setScalar(pulse);
          cv.beaconGroup.position.y = cv.baseY + Math.sin(elapsed * 3.0 + cv.phaseOffset) * 0.18;
        } else {
          beaconMat.color.setHex(0xf4c44e);
          beaconMat.emissive.setHex(0xd4961e);
          beaconMat.emissiveIntensity = 0.55;
          ringMat.color.setHex(0xf4c44e);
          ringMat.opacity = 0.85;
          cv.beaconGroup.scale.setScalar(1.0);
          cv.beaconGroup.position.y = cv.baseY + Math.sin(elapsed * 2.2 + cv.phaseOffset) * 0.12;
        }
        cv.beaconMesh.rotation.y = elapsed * 1.5 + cv.phaseOffset;
      }

      // Highlight active location perimeter ring
      (Object.keys(zoneRingMeshes) as LocationId[]).forEach((locId) => {
        const ring = zoneRingMeshes[locId];
        const rMat = ring.material as THREE.MeshBasicMaterial;
        const isCurrent = locId === curActiveLoc;
        const done = curState.investigations[locId].completed;
        if (done) {
          rMat.color.setHex(0x38b47c);
          rMat.opacity = isCurrent ? 0.72 : 0.36;
        } else if (isCurrent) {
          rMat.color.setHex(0xf4c44e);
          rMat.opacity = 0.72;
        } else {
          rMat.color.setHex(ZONE_CONFIGS[locId].accentHex);
          rMat.opacity = 0.22;
        }
      });

      renderer.render(scene, camera);

      // Project floating 3D location markers directly via DOM refs (no React re-render)
      const canvasW = renderer.domElement.clientWidth;
      const canvasH = renderer.domElement.clientHeight;
      (Object.keys(ZONE_CONFIGS) as LocationId[]).forEach((locId) => {
        const el = markerRefs.current[locId];
        if (!el) return;
        const cfg = ZONE_CONFIGS[locId];
        _projVec.set(
          cfg.position[0] + cfg.markerOffset[0],
          cfg.position[1] + cfg.markerOffset[1],
          cfg.position[2] + cfg.markerOffset[2]
        );
        _projVec.project(camera);

        if (_projVec.z > 1 || _projVec.z < -1) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }

        const screenX = Math.max(88, Math.min(canvasW - 88, (_projVec.x * 0.5 + 0.5) * canvasW));
        const screenY = Math.max(76, Math.min(canvasH - 115, (-_projVec.y * 0.5 + 0.5) * canvasH));
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -100%)`;
      });

      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTarget.dispose();
      scene.environment = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglFailed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0b2a21] text-[#f4ebd0] p-6 text-center space-y-3">
        <Compass className="w-10 h-10 text-[#E7B94F]" />
        <p className="font-display text-lg font-bold">Paparan 3D Tidak Tersedia pada Pelayar Ini</p>
        <p className="text-sm text-[#A9C5AD] max-w-md">
          Anda masih boleh menyiasat kesemua 4 lokasi menggunakan gambar sebenar dan senarai petunjuk
          di bahagian bawah.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" aria-label="Peta Kampus 3D Sekolah Seri Bestari" />

      {/* Projected 3D Location Markers (no backdrop-blur over WebGL canvas) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {LOCATIONS.map((loc) => {
          const cfg = ZONE_CONFIGS[loc.id];
          const inv = state.investigations[loc.id];
          const foundCount = inv.discoveredClueIds.length;
          const totalClues = loc.clues.length;
          const isActive = activeLocationId === loc.id;
          const isDone = inv.completed;
          const isHovered = hoveredZoneId === loc.id;

          return (
            <button
              key={loc.id}
              ref={(el) => {
                markerRefs.current[loc.id] = el;
              }}
              type="button"
              onClick={() => onSelectLocation(loc.id, true)}
              style={{ opacity: 0 }}
              aria-label={`Lokasi ${cfg.code}: ${loc.name} (${foundCount}/${totalClues} bukti)`}
              className={`absolute top-0 left-0 min-h-[44px] px-3 py-1.5 rounded-lg border-2 text-left transition-colors duration-150 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B94F] ${
                isDone
                  ? 'bg-[#123d2d]/95 border-[#52c98e] text-[#f4ebd0]'
                  : isActive || isHovered
                  ? 'bg-[#0b2a21]/95 border-[#E7B94F] text-[#f4ebd0]'
                  : 'bg-[#0b2a21]/90 border-[#c9a24b]/75 text-[#f4ebd0] hover:border-[#E7B94F]'
              }`}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono-tabular font-bold ${
                    isDone
                      ? 'bg-[#52c98e] text-[#0b2a21]'
                      : isActive
                      ? 'bg-[#E7B94F] text-[#0b2a21]'
                      : 'bg-[#1b4d3a] text-[#E7B94F]'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold tracking-wide">
                    {cfg.code} · {loc.name}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-[#d7e8dc]">
                    {isDone ? 'SELESAI' : `${foundCount}/${totalClues} bukti`}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Hover Clue Tooltip Badge (solid surface, zero backdrop-blur) */}
      {hoveredClueLabel && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-lg bg-[#0b2a21]/95 border border-[#E7B94F] text-[#f4ebd0] text-xs font-semibold shadow-lg flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#E7B94F]" />
          <span>Klik untuk periksa: {hoveredClueLabel}</span>
        </div>
      )}

      {/* Quick Return to Overview Camera button inside 3D viewport when zoomed into a zone */}
      {cameraMode === 'focus' && (
        <div className="absolute top-16 right-3 sm:right-4 z-20">
          <button
            type="button"
            onClick={onReturnOverview}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0b2a21]/95 hover:bg-[#15402f] border border-[#E7B94F] text-[#f4ebd0] text-xs font-bold shadow-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#E7B94F]" />
            <span>Peta Kampus 3D</span>
          </button>
        </div>
      )}
    </div>
  );
}
