# The cast

Eleven ready-made characters in `@wireface/sdk/three/characters`, each showing one way to put a face on a head (see them
all in the [Wireface Theatre](https://wireface.dev/threejs/demo/)). They're toy figures about a metre tall, with big
heads so the faces read from across a stage. Eight wear a **FaceMesh** (real geometry) and three a **FaceScreen** (a
live texture).

<img src="images/three/cast.jpg" alt="The eleven characters on the Wireface Theatre's stage">

```js
import { CAST, buildCharacter } from '@wireface/sdk/three/characters';

const grub = buildCharacter('grub');           // or CAST.find(c => c.id === 'grub').build()
scene.add(grub.root);
grub.gazeAt(camera);
const timer = new THREE.Timer();
renderer.setAnimationLoop(time => {
  timer.update(time);
  grub.update(timer.getDelta(), timer.getElapsed());  // breathing, sway, talking gestures
  renderer.render(scene, camera);
});
await grub.speak({ audioContext });            // his recorded line, with its expressions
```

A character has:
- `root` (add it to your scene);
- `head` (what nods and turns);
- `face` (its FaceMesh or FaceScreen);
- `body` and `arms`;
- `update(dt, t)`, `gazeAt(target)` and `speak({ audioContext, onCaption })`;
- `hush()`, which stops its line (and one still loading), and `dispose()`, which frees its face and the figure's
  geometries, materials and textures.

Each definition in `CAST` also has its `name`, `kind`, `face`, `look`, `blurb`, `height`, `line`
(`{ engine, id, cues }`) and `code` (the lines that make its face, as the Theatre's panel shows them).

## Who's who

| | Face | What it shows |
| --- | --- | --- |
| **Mei** (`mei`) | FaceMesh, `mei` skin | The plain case. The face brings the head (its skull, in her skin tone); `hairCap` and `hairFall` give her a bob; `ears()` and `face.skinMaterial()` match her skin. |
| **Walter** (`walter`) | FaceMesh, `walter` skin | Accessories from `face.bounds`: round glasses at the eyes with arms back to the ears, and a flat cap over the skull, all on `face.head` so they nod with him. A walking stick in his hand. |
| **Count Dracula** (`dracula`) | FaceMesh, `dracula` skin | A skin that brings its own teeth (vampire). Slicked hair with a widow's peak, pointed ears, and a cape and high collar from lathes, black outside and red inside. |
| **Grub the ogre** (`grub`) | FaceMesh, `monster` skin | A body in the face's own colour: his belly, hands and pointed ears all wear `face.skinMaterial()`. `headShape: { width }` for a broad head; tapered horns from a tube. |
| **Unit-7** (`unit7`) | FaceMesh, `robot` skin | Changing the skull's material (`face.skullMesh.material.metalness`), bolts for ears, and parts that react to the voice: its chest lights and antenna blink with `face.level`. |
| **Zib** (`zib`) | FaceMesh, sculpt style | No photo at all: the sculpt style in a green skin with violet eyes, and `headShape: { crown }` for a big alien brain. Antennae that spring about as it talks. |
| **Wisp** (`wisp`) | FaceMesh, hologram (`ice`) | A hologram with no skull, glowing in a dark hollow on a ghost's sheet (light needs dark behind it). The sheet's hem ripples; the face's nods move the whole ghost (`face.drive`). |
| **Patch** (`patch`) | FaceMesh, hologram (`ember`) | A head of your own: a ribbed pumpkin, with the face on its front, ahead of `bounds.back`, glowing like a candle-lit carving. A scarecrow's post, shirt and straw. |
| **Captain Amara** (`amara`) | FaceScreen `3d`, `amara` skin | The 3D face's own renderer on a hidden canvas, shown on a curved visor (`visorGeometry`) inside a glass helmet with a dark lining. Her helmet turns towards what she looks at. |
| **Eleanor** (`eleanor`) | FaceScreen `2d`, `eleanor` | Wireface 2D makes an oil painting talk, in a gilt frame on an easel. `framing: 'cover'` fills the canvas; her eyes follow you round the room. |
| **Kit** (`kit`) | FaceScreen `2d`, `kit` | A retro TV for a head: 2D's pixel-art cadet on a bulging screen (`screenGeometry({ curve })`), with scanlines, a vignette and rounded corners from `screen.material()`. |

Their lines are the 3D and 2D faces' recorded clips, and some characters borrow another's voice: Zib speaks
Marcus's line, Wisp Mabel's, Patch Lucia's. Give one a line of its own with `character.lineOverride = { engine, id,
cues }`.

## Making your own

Start from the closest member of the cast (its `code` shows how its face is made), or build from the kit,
`@wireface/sdk/three/kit` (see [Building characters](three.md#8-building-characters)). These lessons came from making
the cast:

- **Let the face set the scale.** Decide the face's `size` first (0.25 to 0.3 for a toy figure about a metre tall),
  then size the body to the head. `face.bounds.skull` is the head's real extent.
- **Hide the joins with things people wear.** The face's edge fades into the skull's colour, but hair, a cap, a hood or
  a helmet makes a head read as a head. `hairCap` sits on the skull's own ellipsoid, so it never cuts into the face.
- **Keep your head behind the face.** For a head of your own (`skull: false`), the face's eyes and mouth are hollows,
  so anything in front of `bounds.back` hides them.
- **A hologram needs the dark.** Additive light on a pale surface washes out to white. Put a dark hollow or plate
  behind it, and use a bloom pass.
- **Move parts with the voice.** `face.level` is how loudly it's talking, frame by frame: lights, antennae, arms.
- **Screens for things that are screens.** A FaceScreen is right for TVs, monitors, visors and paintings. Anything
  meant to be a head is better as a FaceMesh, which is lit and solid from every side.
