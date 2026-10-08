// Uses every entry of @wireface/sdk the way the guides do, so `npx tsc -p test/types` checks the declarations in
// types/ against real code. Nothing here runs; the @ts-expect-error lines prove the types catch mistakes.

import * as THREE from 'three';
import {
  ASSETS, ConfigError, DEFAULT_CONFIG, FaceView, LiveLipSync, MOODS, MOUTH_CHANNELS, MouthTracker, RANGES, StreamVoice,
  Wireface, catalogue, createFace, defineExpression, loadClip, playClip, resolveExpression, skinFromPhoto, validateConfig,
  type Clip, type FaceConfig, type FaceEvent, type MouthPacket, type TeethStyle,
} from '@wireface/sdk';
import { DEFAULTS, PRESETS, STYLES, TEETH_STYLES, validateConfig as checkCoreConfig } from '@wireface/sdk/config';
import {
  ANCHORS, ART_STYLES, CONTROLS, DetectionOverlay, KEYPOINTS, STEPS, TEETH_MODES, TEETH_STYLES as TEETH_2D, VOICES,
  Wireface2D, artStyle, characterData, characterFromImage, createFace2d, detectFace, loadCharacter, teethAsset,
  catalogue as characters, type DetectStep, type LoadedCharacter,
} from '@wireface/sdk/2d';
import { Conversation, ENDINGS, GREET, MIC_WORKLET, type ConversationStatus } from '@wireface/sdk/2d/live';
import {
  CHOICES, SHADINGS, TEETH_MODES as TEETH_MODE_SETTINGS, configDiff, validateConfig as check2dConfig,
  type Face2DConfig,
} from '@wireface/sdk/2d/config';
import { PERSONA, TOOLS, createApi } from '@wireface/sdk/2d/server';
import {
  FaceDriver, FaceMesh, FaceScreen, STATES, Skull, attachFace, createFaceMesh, createFaceScreen, defineExpression as define3d,
  findBone, headShape, onFirstGesture, outline, screenGeometry, setVoiceFolders, skinColour, unlockAudio, validateFaceConfig,
  visorGeometry, voices,
} from '@wireface/sdk/three';
import { CAST, Character, buildCharacter, kit } from '@wireface/sdk/three/characters';
import { box, clay, cloth, ears, glow, hairCap, hairFall, headAt, metal, neck, part, toyBody, vinyl } from '@wireface/sdk/three/kit';

// --- core ----------------------------------------------------------------------------------------------------------

export async function core(canvas: HTMLCanvasElement, audioContext: AudioContext, file: File): Promise<void> {
  const face: Wireface = createFace(canvas, { config: { preset: 'cyan', skin: 'robot', teeth_style: 'normal' }, fit: 0.9 });
  await face.useSkin('mei', { sweep: 1.6 });
  await face.useSkin('robot', { teeth: 'sharp' });
  await face.useSkin({ image: '/faces/ada.jpg', landmarks: '/faces/ada.json', teeth: 'normal' });
  await face.useSkin(await skinFromPhoto(file), { sweep: 1.4 });
  await face.useSkin(await skinFromPhoto(file, { bundle: '/mp/vision_bundle.mjs', wasm: '/mp/wasm', model: '/mp/face_landmarker.task' }));
  await face.useSkin(null);

  const shown: string = face.express('surprised');
  face.express('angry', 10);
  face.mood('content', 0.6);
  face.mood(null);
  face.state('thinking');
  face.state('asleep');
  face.spinner(true);
  face.spinner(false);
  face.pause();
  face.resume();
  console.log(shown, resolveExpression('smile'), MOODS.includes('happy'));

  const clip = await face.clip('dracula');
  const node: AudioBufferSourceNode | null = await face.say(clip, { audioContext, onCaption: text => console.log(text) });
  node?.disconnect();
  await face.say(await face.clip('line', '/my-voices/'));
  const own: Clip = { text: 'Hello there.', duration: 1.42, audio: await audioContext.decodeAudioData(new ArrayBuffer(8)) };
  await playClip(face, own);
  await loadClip('/voices/', 'mei');
  face.hush();

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  const stop = face.listenTo(audioContext, mic);
  stop();
  const element = document.querySelector('audio');
  if (element) face.listenTo(audioContext, element, { gain: 1.3 });
  face.listenTo(audioContext, audioContext.createGain());
  const lips = new LiveLipSync(audioContext, mic);
  lips.attach(face);
  lips.detach();

  const voice = new StreamVoice(face, audioContext, { sampleRate: 24000, buffer: 0.25 });
  voice.onEnd = () => console.log('heard it all');
  voice.push(new Int16Array(2400));
  voice.push(new Float32Array(2400));
  voice.end();
  console.log(voice.position, voice.level, voice.speaking);
  voice.stop();

  const tracker = new MouthTracker(24000);
  const packets: MouthPacket[] = tracker.feed(new Float32Array(480), 0);
  for (const packet of [...packets, ...tracker.flush()]) face.view.timeline.add(packet);
  console.log(MOUTH_CHANNELS.length, tracker.peek()?.frames.length);

  const off = face.on((ev: FaceEvent) => {
    if (ev.type === 'speaking') console.log(ev.text === null ? 'stopped' : `saying ${ev.text}`);
    if (ev.type === 'caption') console.log(ev.text.length);
  });
  off();

  const config: FaceConfig = face.set({ colors: { primary: '#ff4d6d' }, glow: 1.4, scanlines: 0, teeth_style: 'vampire' });
  face.set({ preset: 'amber', skin_amount: 0.5 });
  const teeth: TeethStyle = config.teeth_style;
  console.log(teeth, face.config.colors.primary, PRESETS.cyan.background, RANGES.glow[1], DEFAULT_CONFIG.zoom);

  face.view.setPointer(-300, -50);
  face.view.setPointer(null);
  await face.view.sweep(1, 1.6);
  const where = face.view.bounds();
  if (where) console.log(where.cx, where.top, face.view.hitTest(where.cx, where.cy));
  console.log(face.view instanceof FaceView, face.view.speaking);

  defineExpression('wink', { blinkL: 1, smileL: 0.45, smileR: 0.7, browUpR: 0.3, squintL: 0.3 });
  face.express('wink');
  const skins = await catalogue(ASSETS);
  await face.useSkin(skins[0]?.id ?? null);

  try {
    checkCoreConfig(await (await fetch('/faces/dracula.json')).json());
    validateConfig({ motion: 0.7, expressiveness: 1.3, style: STYLES[0], teeth_style: TEETH_STYLES[2] }, DEFAULTS);
  } catch (e) {
    if (e instanceof ConfigError) console.log(e.message);
  }

  await face.disappear();
  await face.appear();
  face.destroy();

  // @ts-expect-error: not a state
  face.state('sleeping');
  // @ts-expect-error: not a teeth style
  face.set({ teeth_style: 'gold' });
  // @ts-expect-error: not a setting
  face.set({ glo: 1 });
  // @ts-expect-error: not a preset
  face.set({ preset: 'teal' });
  // @ts-expect-error: not a channel
  defineExpression('oops', { mouthOpen: 1 });
  // @ts-expect-error: a skin needs its landmarks
  await face.useSkin({ image: '/faces/ada.jpg' });
}

// --- 2D ------------------------------------------------------------------------------------------------------------

export async function twoD(canvas: HTMLCanvasElement, audioContext: AudioContext, file: File, stage: HTMLElement): Promise<void> {
  const face: Wireface2D = createFace2d(canvas, {
    assets: '/wireface-2d/',
    config: { framing: 'face', depth: 'auto', teeth_mode: 'asset', teeth_style: 'anime' },
    detect: { gemini: { endpoint: '/api/detect' } },
  });
  const list = await face.catalogue();
  console.log(list.map(c => `${c.name} (${c.styleLabel})`), (await characters()).length);
  await face.useCharacter('eleanor', { transition: 0.9 });

  const overlay = new DetectionOverlay(stage);
  overlay.place({ x: 0, y: 0, width: 480, height: 640 });
  overlay.scan(true);
  const worn: LoadedCharacter = await face.useCharacter(file, { onStep: s => overlay.step(s) });
  console.log(worn.uvs.length, face.character?.name);
  const view = face.view.character;
  if (view) await overlay.replay(face.character?.trace, view.uvs);
  await overlay.fade();

  const found = await detectFace(file, {
    gemini: { apiKey: 'local-only' },
    mediapipe: false,
    onStep: (s: DetectStep) => {
      if (s.id === 'gemini' && s.data?.found) console.log(s.data.style, s.data.character?.voice);
      if (s.id === 'fit' && s.status === 'done') console.log(s.data?.mode);
    },
  });
  if (found.mode === 'manual') console.log('fit it by hand');
  console.log(found.pose.supported, found.keypoints.nose_tip, STEPS.map(s => s.label));

  const c = await characterFromImage(file, { gemini: { endpoint: '/api/detect' } });
  await face.useCharacter(c);
  const saved = characterData(c);
  await face.useCharacter({ image: '/my/ada.jpg', landmarks: saved.landmarks });
  await loadCharacter({ image: '/my/ada.jpg', landmarks: saved.landmarks, style: 'painting' });

  const fit = face.editFit();
  console.log(fit.names, fit.points());
  fit.move(2, [120, 240]);
  fit.shift(4, -2);
  fit.shape({ scaleX: 1.1, scaleY: 0.95, rotation: 0.05 });
  const uvs: Float32Array = fit.done();
  face.editFit({ handles: ANCHORS }).reset();
  console.log(uvs.length, CONTROLS.length, KEYPOINTS[0]?.ask);

  face.express('surprised', 3);
  face.mood('content', 0.6);
  face.state('thinking');
  await face.say(await face.clip('ava'), { audioContext, onCaption: text => console.log(text) });
  face.hush();
  const stop = face.listenTo(audioContext, await navigator.mediaDevices.getUserMedia({ audio: true }));
  stop();

  const cfg: Face2DConfig = face.set(check2dConfig(await (await fetch('face.json')).json()));
  console.log(configDiff(cfg), CHOICES.framing, SHADINGS, TEETH_MODE_SETTINGS.includes('auto'));
  const [x, y] = face.project([0.5, 0.4]);
  console.log(face.unproject([x, y]), face.view.vertices().length, face.view.eyes());
  console.log(TEETH_MODES, TEETH_2D.map(([id, label]) => `${id}: ${label}`), teethAsset('anime').url);
  console.log(ART_STYLES.anime.depth, artStyle(found.style).teeth[0], VOICES.Puck);
  face.on(ev => console.log(ev.type));
  await face.disappear();
  await face.appear();
  face.destroy();

  // @ts-expect-error: not a framing
  face.set({ framing: 'stretch' });
  // @ts-expect-error: not a teeth style
  face.set({ teeth_style: 'gold' });
  // @ts-expect-error: not a state
  face.state('dreaming');
  // @ts-expect-error: core's settings aren't 2D's
  face.set({ preset: 'cyan' });
}

// --- conversations -------------------------------------------------------------------------------------------------

export async function live(face: Wireface2D, caption: HTMLElement): Promise<void> {
  let audioContext: AudioContext | null = null;
  const talk = new Conversation(face, {
    audio: async () => (audioContext ??= new AudioContext()),
    character: () => ({ character: 'ava' }),
    token: '/api/live/token',
    onState: ({ state, detail, left, mic }: ConversationStatus) => console.log(state, detail, left, mic),
    onCaption: ({ who, text }) => { caption.textContent = `${who === 'you' ? 'You' : 'Ava'}: ${text}`; },
  });
  await talk.start();
  talk.send('Tell me about yourself');
  await talk.setMic(true);
  talk.changeFace('Sora');
  talk.end();
  talk.destroy();
  console.log(talk.state, talk.history.length, ENDINGS.cap, GREET, MIC_WORKLET);

  const dev = new Conversation(face, { audio: () => new AudioContext(), apiKey: () => 'held in memory', greet: '' });
  await dev.start({ then: 'hello' });

  // @ts-expect-error: it needs an AudioContext
  new Conversation(face, { character: () => ({ character: 'ava' }) });
}

// --- the server ----------------------------------------------------------------------------------------------------

export async function server(): Promise<void> {
  const api = createApi({
    key: 'from the environment', hosts: ['example.com'], origins: ['https://example.com'], trustProxy: true, perDay: 50,
  });
  const req = {
    url: '/api/status', method: 'GET', headers: { host: 'example.com' }, socket: { remoteAddress: '127.0.0.1' },
    on(event: string, listener: (...args: any[]) => void) { console.log(event, listener); return this; },
    destroy() { return this; },
  };
  const res = {
    destroyed: false,
    writeHead(status: number, headers?: Record<string, string>) { console.log(status, headers); },
    end(body?: string) { console.log(body); },
  };
  const handled: boolean = await api.handle(req, res);
  console.log(handled, api.enabled, PERSONA.length, TOOLS[0]?.functionDeclarations.length);

  // @ts-expect-error: hosts are a list
  createApi({ hosts: 'example.com' });
}

// --- three.js ------------------------------------------------------------------------------------------------------

export async function three(scene: THREE.Scene, camera: THREE.PerspectiveCamera, button: HTMLButtonElement): Promise<void> {
  const head = new THREE.Group();
  head.position.y = 1.1;
  scene.add(head);

  const face = new FaceMesh({ skin: 'mei', size: 0.24 });
  attachFace(head, face, { at: [0, 0.16, 0], rotation: [0, 0, 0], size: 0.27, motion: true });
  face.gazeAt(camera);
  face.gazeAt(new THREE.Vector3(1, 1.5, 2));
  face.gazeAt([1, 1.5, 2], { turn: 0.4 });
  face.gazeAt(null);
  await face.ready;

  const { skull, eyes } = face.bounds;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2), new THREE.MeshStandardMaterial());
  hat.position.set(0, skull.center.y + skull.radius.y * 0.8, skull.center.z);
  const glasses = new THREE.Group();
  glasses.position.set(0, eyes.left.y, eyes.left.z + eyes.radius * 2.7);
  face.head.add(hat, glasses);
  const skin = face.skinMaterial({ roughness: 0.7 });
  skin.color.copy(face.headColor);

  button.onclick = async () => {
    const audioContext = unlockAudio();
    await face.say(await face.clip('mei'), { audioContext });
    await face.say(await face.clip('eleanor', voices('2d')), { audioContext, onCaption: t => console.log(t) });
  };
  onFirstGesture(ctx => console.log(ctx.state));
  setVoiceFolders({ '3d': '/wireface/voices/', '2d': '/wireface-2d/voices/' });

  face.express('surprised', 3);
  face.mood('content', 0.6);
  face.state('thinking');
  face.spinner();
  face.set({ preset: 'ember', style: 'toon' });
  await face.useSkin('dracula', { sweep: 1.4 });
  face.on(ev => { if (ev.type === 'skin') console.log(ev.skin); });
  console.log(face.speaking, face.level, face.motion.yaw, face.style, face.config.style, face.view.state());
  face.surface.material = skin;
  face.drive(null);
  face.setSize(0.3).position.set(0, 0, 0.1);
  const copy: FaceMesh = face.clone();
  copy.update();

  const holo = createFaceMesh({ style: 'hologram', preset: 'violet', glow: 1.2, points: 0.4, skull: false, headShape: { crown: 1 } });
  validateFaceConfig({ style: 'toon' });
  const robot = findBone(scene, /^head$/i);
  if (robot) attachFace(robot, holo, { at: [0, 0.0045, 0.0152], size: 0.44 });

  const screen = new FaceScreen({ engine: '2d', character: 'eleanor', config: { framing: 'cover', zoom: 1.08 }, resolution: [416, 520] });
  const painting = screen.bind(new THREE.Mesh(screenGeometry({ width: 0.6, height: 0.8 }), screen.material({ corner: 0.05 })));
  scene.add(painting);
  screen.gazeAt(camera);
  await screen.ready;
  await screen.face?.useCharacter('kit');
  await screen.say(await screen.clip('eleanor', voices('2d')) ?? { duration: 0 });

  const tv = createFaceScreen({ skin: 'robot', resolution: 512, config: { preset: 'green' } });
  const visor = new THREE.Mesh(visorGeometry({ radius: 0.2 }), tv.material({ background: null, scanlines: 0.4 }));
  tv.bind(visor);
  tv.face?.view.setPointer(0, 0);
  tv.spinner(true);
  tv.dispose();

  const talk = new Conversation(face, {
    audio: () => unlockAudio(),
    character: () => ({ name: 'Unit-7', voice: 'Puck', persona: 'You are Unit-7, a cheerful robot.' }),
  });
  await talk.start();

  define3d('wink', { blinkL: 1, smileL: 0.45 });
  const driver = new FaceDriver();
  driver.status = { state: STATES.thinking };
  const frame = driver.step({ motion: 1, expressiveness: 1.3 });
  const shape = headShape(driver.rig.base, outline(), { crown: 0.5 });
  const back = new Skull(driver.rig, { width: 1.1 });
  back.update(driver.pose.pos, driver.pose.nrm);
  console.log(frame.talk, shape.radii, skinColour(new ImageBitmap(), [[0.5, 0.5]]).getHexString());
  face.dispose();

  // @ts-expect-error: not a FaceMesh style
  new FaceMesh({ style: 'neon' });
  // @ts-expect-error: 2D's settings have no preset
  new FaceScreen({ engine: '2d', config: { preset: 'cyan' } });
  // @ts-expect-error: not a state
  face.state('waving');
}

// --- characters ----------------------------------------------------------------------------------------------------

export async function cast(scene: THREE.Scene, camera: THREE.Camera, audioContext: AudioContext): Promise<void> {
  const walter = buildCharacter('walter');
  scene.add(walter.root);
  walter.gazeAt(camera);
  walter.update(1 / 60, 0);
  await walter.speak({ audioContext, onCaption: t => console.log(t) });
  walter.hush();
  walter.dispose();
  const everyone = CAST.map(c => buildCharacter(c.id, c.face === 'FaceMesh' ? { size: 0.3 } : { resolution: 256 }));
  console.log(everyone.length, CAST[0]?.blurb, buildCharacter('kit').top().y);

  const c = new Character({ id: 'ana', name: 'Ana', height: 1.06, line: { engine: '3d', id: 'amara' } });
  c.face = new FaceMesh({ skin: 'amara', size: 0.27 });
  const skin = c.face.skinMaterial();
  const { torsoTop } = toyBody(c, { top: cloth('#4f46e5'), bottom: cloth('#1f2937'), shoes: vinyl('#fafafa'), skin });
  neck(c, skin, torsoTop - 0.03, torsoTop + 0.05);
  attachFace(headAt(c, torsoTop + 0.03), c.face, { at: [0, 0.165, 0] });
  hairCap(c.face, clay('#120c0a'), { front: 0.3 });
  hairFall(c.face, clay('#120c0a'), { length: 0.95, open: 2.4 });
  ears(c.face, { size: 0.9 });
  kit.ears(c.face, { point: 0.5 });
  c.extras.push((dt, t, me) => { me.root.rotation.y = Math.sin(t) * dt; });
  c.body.add(part(box(0.44, 0.34, 0.3, 0.06), metal('#30343c'), [0, 0.19, -0.02], { name: 'cabinet' }));
  c.body.add(part(kit.ball(0.008, 10, 8), glow('#ff4d4d', 2), [0.17, 0.095, 0.135], { shadow: false }));
  const line = await c.line();
  console.log(line.clip.duration, line.cues.length);
  scene.add(c.root);

  // @ts-expect-error: not in the cast
  buildCharacter('bob');
  // @ts-expect-error: a character needs its line
  new kit.Character({ id: 'x', name: 'X' });
}
