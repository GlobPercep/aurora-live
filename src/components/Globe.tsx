import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AuroraData, LocationPoint, VisualSettings } from '../types';
import { latLonToCartesian } from '../lib/geo';
import { solarElevation, subsolarLongitude, sunDeclination } from '../lib/astronomy';

interface Props { data: AuroraData | null; settings: VisualSettings; location: LocationPoint | null; view: string; onWebgl: (value: boolean) => void }

export function Globe({ data, settings, location, view, onWebgl }: Props) {
  const mount = useRef<HTMLDivElement>(null); const sceneRef = useRef<THREE.Scene | null>(null); const auroraRef = useRef<THREE.Points | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null); const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); const [ready, setReady] = useState(false);
  const motionRef = useRef(settings.motion); const reducedRef = useRef(settings.reducedMotion);

  useEffect(() => {
    if (!mount.current) return; const host = mount.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !settings.lowPower, alpha: true, powerPreference: settings.lowPower ? 'low-power' : 'high-performance' }); }
    catch { onWebgl(false); return; }
    onWebgl(true); renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.lowPower ? 1 : 1.6)); renderer.setSize(host.clientWidth, host.clientHeight); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; host.append(renderer.domElement);
    const scene = new THREE.Scene(); sceneRef.current = scene; const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, .1, 100); camera.position.set(0, .15, 3.25); cameraRef.current = camera;
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .055; controls.minDistance = 1.85; controls.maxDistance = 5; controls.enablePan = false; controls.autoRotate = !settings.reducedMotion && settings.motion > 0; controls.autoRotateSpeed = .12 + settings.motion * .28; controlsRef.current = controls;
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    const texture = new THREE.TextureLoader().load('./earth-blue-marble.jpg', () => setReady(true), undefined, () => setReady(true)); texture.colorSpace = THREE.SRGBColorSpace;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, settings.lowPower ? 48 : 80, settings.lowPower ? 32 : 64), new THREE.MeshStandardMaterial({ map: texture, roughness: .82, metalness: .04 })); earth.rotation.y = -Math.PI / 2; scene.add(earth);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.035, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: 'varying vec3 n; varying vec3 w; void main(){n=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.); w=p.xyz; gl_Position=projectionMatrix*p;}', fragmentShader: 'varying vec3 n; varying vec3 w; void main(){float f=pow(1.0-abs(dot(normalize(n),normalize(-w))),2.6); gl_FragColor=vec4(.12,.55,.88,f*.72);}' })); scene.add(atmosphere);
    scene.add(new THREE.AmbientLight(0x19314a, 1.2)); const sun = new THREE.DirectionalLight(0xfff4d6, 3.4); sun.name = 'sun'; scene.add(sun);
    const starGeo = new THREE.BufferGeometry(); const count = settings.lowPower ? 420 : 1000; const positions = new Float32Array(count * 3); let seed = 42;
    const random = () => { seed = seed * 1664525 + 1013904223 >>> 0; return seed / 4294967296; };
    for (let i = 0; i < count; i++) { const r = 12 + random() * 18; const theta = random() * Math.PI * 2; const phi = Math.acos(2 * random() - 1); positions[i * 3] = r * Math.sin(phi) * Math.cos(theta); positions[i * 3 + 1] = r * Math.cos(phi); positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta); }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaacbe4, size: .018, transparent: true, opacity: .72, sizeAttenuation: true })));
    const sunLon = subsolarLongitude(new Date()); const sunLat = sunDeclination(new Date()); const [sx, sy, sz] = latLonToCartesian(sunLat, sunLon, 5); sun.position.set(sx, sy, sz);
    const sunDirection = new THREE.Vector3(sx, sy, sz).normalize();
    const twilight = new THREE.Group(); twilight.name = 'twilight'; twilight.visible = settings.twilight;
    [1.008, 1.011, 1.014].forEach((radius, i) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .0025 + i * .0018, 6, 160), new THREE.MeshBasicMaterial({ color: [0x7bc5e6, 0x596fa9, 0x76569b][i], transparent: true, opacity: .17 - i * .03, blending: THREE.AdditiveBlending, depthWrite: false })); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sunDirection); twilight.add(ring); }); scene.add(twilight);
    const subsolar = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffdca0 })); subsolar.name = 'subsolar'; subsolar.visible = settings.subsolar; subsolar.position.copy(sunDirection.multiplyScalar(1.025)); scene.add(subsolar);
    const resize = () => { if (!host.clientWidth || !host.clientHeight) return; camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
    const observer = new ResizeObserver(resize); observer.observe(host); let frame = 0;
    const animate = () => { frame = requestAnimationFrame(animate); controls.update(); if (auroraRef.current && !reducedRef.current) auroraRef.current.rotation.y = -Math.PI / 2 + Math.sin(Date.now() * .00032) * .006 * motionRef.current; renderer.render(scene, camera); }; animate(); setReady(true);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose(); texture.dispose(); scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Points) { object.geometry.dispose(); const material = object.material; if (Array.isArray(material)) material.forEach((m) => m.dispose()); else material.dispose(); } }); host.replaceChildren(); };
  }, [onWebgl, settings.lowPower]);

  useEffect(() => { motionRef.current = settings.motion; reducedRef.current = settings.reducedMotion; if (controlsRef.current) { controlsRef.current.autoRotate = !settings.reducedMotion && settings.motion > 0; controlsRef.current.autoRotateSpeed = .12 + settings.motion * .28; } }, [settings.reducedMotion, settings.motion]);

  useEffect(() => { const scene = sceneRef.current; if (!scene) return; const twilight = scene.getObjectByName('twilight'); const subsolar = scene.getObjectByName('subsolar'); if (twilight) twilight.visible = settings.twilight; if (subsolar) subsolar.visible = settings.subsolar; }, [settings.twilight, settings.subsolar]);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return; if (auroraRef.current) { scene.remove(auroraRef.current); auroraRef.current.geometry.dispose(); (auroraRef.current.material as THREE.Material).dispose(); auroraRef.current = null; }
    if (!data) return;
    const filtered = data.points.filter((p) => p.value >= 3 && (settings.hemisphere === 'both' || (settings.hemisphere === 'north' ? p.lat >= 0 : p.lat < 0)));
    const stride = settings.lowPower ? 5 : 2; const positions: number[] = []; const colors: number[] = [];
    for (let i = 0; i < filtered.length; i += stride) { const p = filtered[i]; const lift = 1.018 + p.value / 100 * .065; positions.push(...latLonToCartesian(p.lat, p.lon, lift)); const t = p.value / 100; const b = settings.brightness; colors.push(Math.min(.32, (.04 + t * .22) * b), Math.min(.82, (.3 + t * .6) * b), Math.min(.5, (.12 + t * .38) * b)); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: settings.grid ? .012 : .022, vertexColors: true, transparent: true, opacity: settings.opacity * .8, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material); points.rotation.y = -Math.PI / 2; scene.add(points); auroraRef.current = points;
  }, [data, settings.hemisphere, settings.grid, settings.lowPower, settings.opacity, settings.brightness]);

  useEffect(() => {
    const camera = cameraRef.current; const controls = controlsRef.current; if (!camera || !controls) return;
    let target: [number, number, number] = [0, .15, 3.25];
    if (view === 'arctic') target = [0, 3.2, .15]; else if (view === 'antarctic') target = [0, -3.2, .15]; else if (view === 'location' && location) { const [x, y, z] = latLonToCartesian(location.lat, location.lon, 3.2); target = [x, y, z]; }
    else if ((view === 'bestNorth' || view === 'bestSouth') && data) {
      const north = view === 'bestNorth'; const candidates = data.points.filter((point) => north ? point.lat > 0 : point.lat < 0);
      const best = candidates.length ? candidates.reduce((winner, point) => point.value + (solarElevation(new Date(), point.lat, point.lon) < -12 ? 25 : 0) > winner.value + (solarElevation(new Date(), winner.lat, winner.lon) < -12 ? 25 : 0) ? point : winner) : null;
      if (best) { const [x, y, z] = latLonToCartesian(best.lat, best.lon, 3.2); target = [x, y, z]; }
    }
    camera.position.set(...target); controls.target.set(0, 0, 0); controls.update();
  }, [view, location, data]);

  return <div className="globe-wrap" ref={mount} aria-label="Interactive 3D Earth with NOAA aurora forecast"><div className={`globe-loading ${ready ? 'is-ready' : ''}`}>Preparing Earth</div></div>;
}
