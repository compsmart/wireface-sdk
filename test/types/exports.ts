// The value exports declared for each entry must be exactly the runtime exports listed in exports.json (keep the two
// in step). Type-only exports (interfaces and type aliases) aren't values, so they don't count.

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

export type sdk = Expect<Equal<keyof typeof import('@wireface/sdk'),
  'ALIASES' | 'ASSETS' | 'CHANNELS' | 'ConfigError' | 'DEFAULTS' | 'DEFAULT_CONFIG' | 'EXPRESSIONS' | 'FaceView' |
  'LiveLipSync' | 'MEDIAPIPE' | 'MOODS' | 'MOUTH_CHANNELS' | 'MouthTracker' | 'PRESETS' | 'RANGES' | 'STYLES' |
  'StreamVoice' | 'TEETH_STYLES' | 'Wireface' | 'catalogue' | 'createFace' | 'defineExpression' | 'loadClip' |
  'playClip' | 'resolveExpression' | 'skinFromPhoto' | 'validateConfig'>>;

export type sdk_config = Expect<Equal<keyof typeof import('@wireface/sdk/config'),
  'ConfigError' | 'DEFAULTS' | 'PRESETS' | 'RANGES' | 'STYLES' | 'TEETH_STYLES' | 'validateConfig'>>;

export type sdk_2d = Expect<Equal<keyof typeof import('@wireface/sdk/2d'),
  'ALIASES' | 'ANCHORS' | 'ART_STYLES' | 'ART_STYLE_IDS' | 'ASSETS' | 'CHANNELS' | 'CHOICES' | 'CONTROLS' |
  'ConfigError' | 'DEFAULTS' | 'DEFAULT_CONFIG' | 'DETECT_MODELS' | 'DetectionOverlay' | 'EXPRESSIONS' | 'FRAMINGS' |
  'FaceView2D' | 'KEYPOINTS' | 'LiveLipSync' | 'MEDIAPIPE' | 'MOODS' | 'RANGES' | 'STEPS' | 'StreamVoice' |
  'TEETH_MODES' | 'TEETH_STYLES' | 'VOICES' | 'Wireface2D' | 'artStyle' | 'catalogue' | 'characterData' |
  'characterFromImage' | 'configDiff' | 'createFace2d' | 'defineExpression' | 'detectFace' | 'loadCharacter' |
  'loadClip' | 'playClip' | 'resolveExpression' | 'teethAsset' | 'validateConfig'>>;

export type sdk_2d_live = Expect<Equal<keyof typeof import('@wireface/sdk/2d/live'),
  'Conversation' | 'ENDINGS' | 'GREET' | 'MIC_WORKLET'>>;

export type sdk_2d_config = Expect<Equal<keyof typeof import('@wireface/sdk/2d/config'),
  'CHOICES' | 'ConfigError' | 'DEFAULTS' | 'FRAMINGS' | 'RANGES' | 'SHADINGS' | 'SMOOTHINGS' | 'TEETH_MODES' |
  'configDiff' | 'validateConfig'>>;

export type sdk_2d_server = Expect<Equal<keyof typeof import('@wireface/sdk/2d/server'),
  'PERSONA' | 'TOOLS' | 'createApi'>>;

export type sdk_three = Expect<Equal<keyof typeof import('@wireface/sdk/three'),
  'ALIASES' | 'ASSETS' | 'CHANNELS' | 'ConfigError' | 'DEFAULTS' | 'EXPRESSIONS' | 'FaceDriver' | 'FaceMesh' |
  'FaceScreen' | 'LiveLipSync' | 'MOODS' | 'MouthTracker' | 'PRESETS' | 'RANGES' | 'STATES' | 'STYLES' | 'Skull' |
  'StreamVoice' | 'TEETH_STYLES' | 'attachFace' | 'audioContext' | 'catalogue' | 'createFaceMesh' |
  'createFaceScreen' | 'defineExpression' | 'findBone' | 'headShape' | 'irisColour' | 'loadClip' | 'onFirstGesture' |
  'outline' | 'playClip' | 'resolveExpression' | 'screenGeometry' | 'setVoiceFolders' | 'shareExpressions' |
  'skinColour' | 'skinFromPhoto' | 'unlockAudio' | 'validateFaceConfig' | 'visorGeometry' | 'voices'>>;

export type sdk_three_characters = Expect<Equal<keyof typeof import('@wireface/sdk/three/characters'),
  'CAST' | 'Character' | 'buildCharacter' | 'kit'>>;

export type sdk_three_kit = Expect<Equal<keyof typeof import('@wireface/sdk/three/kit'),
  'Character' | 'ball' | 'box' | 'capsule' | 'clay' | 'cloth' | 'ears' | 'glass' | 'glow' | 'hairCap' | 'hairFall' |
  'headAt' | 'lathe' | 'metal' | 'neck' | 'part' | 'smoothLathe' | 'toyBody' | 'tube' | 'vinyl'>>;
