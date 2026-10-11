// The can's face (drawn-face.html): a square picture in the can's paint, and where its features are (0..1 across and
// down), which is what Wireface 2D fits its face to. tools/bake-faces.mjs bakes it for each coat of paint into
// faces/can-<paint>.wireface.json; wear drawFace(color) yourself ({ image, keypoints }) to change it live.
export const PAINTS = { tomato: '#d9483b', mint: '#5fb8a4', mustard: '#e0b43c', sky: '#5b8fd9' };

export function drawFace(color, size = 512) {
  const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
  const g = canvas.getContext('2d');
  g.scale(size, size);
  g.fillStyle = color;
  g.fillRect(0, 0, 1, 1);
  g.fillStyle = g.strokeStyle = '#1b1b22';
  g.lineCap = 'round';
  for (const x of [0.37, 0.63]) {
    g.beginPath();
    g.ellipse(x, 0.43, 0.05, 0.068, 0, 0, Math.PI * 2);      // an eye
    g.fill();
    g.lineWidth = 0.018;
    g.beginPath();
    g.moveTo(x - 0.06, 0.33 + (x < 0.5 ? 0.008 : 0));         // a brow
    g.quadraticCurveTo(x, 0.305, x + 0.06, 0.33 + (x < 0.5 ? 0 : 0.008));
    g.stroke();
  }
  g.fillStyle = '#ffffff';
  for (const x of [0.385, 0.645]) { g.beginPath(); g.arc(x, 0.41, 0.014, 0, Math.PI * 2); g.fill(); }
  g.lineWidth = 0.012;                                        // a little nose
  g.beginPath();
  g.moveTo(0.49, 0.53);
  g.quadraticCurveTo(0.515, 0.545, 0.495, 0.56);
  g.stroke();
  g.lineWidth = 0.016;                                        // a closed smile (the face opens it to talk)
  g.beginPath();
  g.moveTo(0.42, 0.62);
  g.quadraticCurveTo(0.5, 0.67, 0.58, 0.62);
  g.stroke();
  const keypoints = {
    left_eye_outer: [0.32, 0.43], left_eye_center: [0.37, 0.43], left_eye_inner: [0.42, 0.43],
    right_eye_inner: [0.58, 0.43], right_eye_center: [0.63, 0.43], right_eye_outer: [0.68, 0.43],
    left_brow: [0.37, 0.32], right_brow: [0.63, 0.32], forehead: [0.5, 0.24], nose_tip: [0.5, 0.55],
    mouth_left: [0.42, 0.62], mouth_right: [0.58, 0.62], upper_lip: [0.5, 0.637], lower_lip: [0.5, 0.653],
    chin: [0.5, 0.8], left_cheek: [0.24, 0.45], right_cheek: [0.76, 0.45], left_jaw: [0.3, 0.7], right_jaw: [0.7, 0.7],
  };
  return { image: canvas, keypoints, style: 'cartoon', name: 'Tin' };
}
