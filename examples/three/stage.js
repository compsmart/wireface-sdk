// The usual three.js set-up the examples share, so each page can show only what's about faces: a renderer on the
// page's <canvas>, a camera you can orbit, soft studio light, a floor, and a frame loop that keeps to the canvas size
// (and, given the scene's width, a camera that stands back on a narrow screen until all of it is in view).
// hello.html does all of this by hand, if you'd like to see it in one place.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * @param {object} [o]
 * @param {number[]} [o.camera]  where the camera starts
 * @param {number[]} [o.target]  what it orbits round
 * @param {number} [o.width]     how wide the scene is round the target (m): on a narrow screen the camera stands back
 *                               until all of it fits
 * @param {string} [o.background]
 * @param {boolean} [o.floor]
 * @param {number} [o.bloom]     a bloom pass of this strength (0: none), for holograms and anything that glows
 * @returns {{ scene, camera, renderer, controls, onFrame(fn) }}  onFrame(fn): fn(dt, time) every frame
 */
export function stage({ camera: at = [0, 1.25, 2.2], target = [0, 1.05, 0], width = 0, background = '#0b1020', floor = true, bloom = 0 } = {}) {
  const canvas = document.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(background, 6, 14);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
  camera.position.fromArray(at);
  const controls = new OrbitControls(camera, canvas);
  controls.target.fromArray(target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.minDistance = 0.5;
  controls.maxDistance = 8;

  scene.add(new THREE.HemisphereLight('#dfe8ff', '#2a2230', 0.9));
  const key = new THREE.DirectionalLight('#fff1e0', 2.6);
  key.position.set(1.5, 3, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#7dd3fc', 1.4);
  rim.position.set(-2, 2, -2.5);
  scene.add(rim);

  if (floor) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: '#1a2036', roughness: 0.92 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  let composer = null;
  if (bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), bloom, 0.45, 0.9));
    composer.addPass(new OutputPass());
  }

  // keep `width` in view: as far back from the target as the screen's shape needs, and never nearer than it starts
  const reach = camera.position.distanceTo(controls.target);
  let fitted = 1;
  const fit = aspect => {
    const across = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;
    const k = Math.max(1, width / 2 / across / reach);
    camera.position.sub(controls.target).multiplyScalar(k / fitted).add(controls.target);
    controls.maxDistance = Math.max(8, reach * k * 1.5);
    scene.fog.near = 6 + reach * (k - 1);
    scene.fog.far = 14 + reach * (k - 1);
    fitted = k;
  };

  const frames = [];
  const timer = new THREE.Timer();
  timer.connect(document);
  renderer.setAnimationLoop(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      if (width) fit(camera.aspect);
    }
    timer.update();
    const dt = Math.min(0.1, timer.getDelta()), t = timer.getElapsed();
    for (const fn of frames) fn(dt, t);
    controls.update();
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
  });
  return { scene, camera, renderer, controls, onFrame: fn => frames.push(fn) };
}
