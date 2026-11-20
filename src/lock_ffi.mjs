import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// ================= AJUSTES (puedes tocarlos) =================
const MAX_YAW = THREE.MathUtils.degToRad(60); // giro máximo de la cámara
const PHONE_SENSITIVITY = 1.5; // móvil: 1.5 = giras 40° y la cámara gira 60°
const PHONE_DIRECTION = 1;     // si en el móvil gira al revés, cámbialo a -1
const SMOOTH = 0.08;           // suavidad del giro de cámara

const MAX_DIGITS = 6;
const KEYPAD_SCALE = 0.8; // tamaño del teclado (1 = tamaño anterior)
const PAPER_Z = 3.4;      // más alto = papeles más hacia los lados (más cerca de ti)
const WALL_H = 24;        // altura de las paredes

const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["back", "0", "enter"],
];
const LABELS = { back: "⌫", enter: "↵" };
const KEY_SIZE = 0.7;
const KEY_STEP = 0.85;
const KEY_DEPTH = 0.4;
const KEY_RADIUS = 0.12; // redondeo de las teclas
const KEY_TRAVEL = 0.12; // cuánto se hunde una tecla al pulsarla

// ================= Texturas con canvas =================
function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function keyTexture(text, bg, fg) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = fg;
  ctx.font = "bold 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 70);
  return toTexture(c);
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

function paperTexture(text) {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 800;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fffdf5";
  ctx.fillRect(0, 0, 600, 800);
  ctx.strokeStyle = "#e6e2d3";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 594, 794);
  ctx.fillStyle = "#222";
  ctx.font = "40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, text, 480);
  const lh = 56;
  const y0 = 400 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, 300, y0 + i * lh));
  return toTexture(c);
}

// ================= Pantalla de la combinación =================
export function show_lock(leftNote, rightNote, addDigit, removeDigit, isCorrect, onUnlock) {
  // ---------- Renderer, escena y cámara ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const dom = renderer.domElement;
  dom.style.touchAction = "none";
  document.body.appendChild(dom);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdcdcdc);
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2, 4, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  // ---------- Habitación: pared del fondo + izquierda + derecha ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 1 });

  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, WALL_H), wallMat);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(10, WALL_H), wallMat);
  left.position.set(-5, 0, 5);
  left.rotation.y = Math.PI / 2;
  const right = new THREE.Mesh(new THREE.PlaneGeometry(10, WALL_H), wallMat);
  right.position.set(5, 0, 5);
  right.rotation.y = -Math.PI / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -WALL_H / 2, 5);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, WALL_H / 2, 5);
  scene.add(back, left, right, floor, ceiling);

  // ---------- Papeles colgados ----------
  function addPaper(text, x, rotY, z, tilt) {
    const g = new THREE.Group();
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 3.2),
      new THREE.MeshStandardMaterial({ map: paperTexture(text), roughness: 0.9 }),
    );
    const tape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf2d97a, transparent: true, opacity: 0.85 }),
    );
    tape.position.set(0, 1.6, 0.005);
    g.add(paper, tape);
    g.position.set(x, 0.3, z);
    g.rotation.y = rotY;
    g.rotation.z = tilt;
    scene.add(g);
  }
  addPaper(leftNote, -4.99, Math.PI / 2, PAPER_Z, 0.03);
  addPaper(rightNote, 4.99, -Math.PI / 2, PAPER_Z, -0.03);

  // ---------- Teclado 3D ----------
  const keypad = new THREE.Group();
  keypad.scale.setScalar(KEYPAD_SCALE);
  scene.add(keypad);

  const panel = new THREE.Mesh(
    new RoundedBoxGeometry(3.2, 4.8, 0.3, 4, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.6 }),
  );
  panel.position.z = 0.15;
  keypad.add(panel);

  // Pantallita de dígitos
  const dispCanvas = document.createElement("canvas");
  dispCanvas.width = 512;
  dispCanvas.height = 128;
  const dispTex = toTexture(dispCanvas);
  const dispSide = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const display = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.7, 0.1, 3, 0.04), [
    dispSide, dispSide, dispSide, dispSide,
    new THREE.MeshBasicMaterial({ map: dispTex }),
    dispSide,
  ]);
  display.position.set(0, 1.8, 0.35);
  keypad.add(display);

  function drawDisplay(value, state = "normal") {
    const ctx = dispCanvas.getContext("2d");
    ctx.fillStyle = state === "error" ? "#5a1010" : state === "ok" ? "#10361c" : "#101418";
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = "bold 80px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const slot = 512 / MAX_DIGITS;
    for (let i = 0; i < MAX_DIGITS; i++) {
      const filled = i < value.length;
      ctx.fillStyle = filled
        ? state === "error" ? "#ff6b6b" : state === "ok" ? "#69db7c" : "#ffffff"
        : state === "error" ? "#8a3a3a" : "#4a525c";
      ctx.fillText(filled ? value[i] : "–", slot * i + slot / 2, 68);
    }
    dispTex.needsUpdate = true;
  }

  // Teclas (cubos redondeados)
  const keyMeshes = [];
  const keyByName = {};
  const baseZ = 0.3 + KEY_DEPTH / 2;

  KEY_ROWS.forEach((row, r) => {
    row.forEach((name, c) => {
      const isEnter = name === "enter";
      const bg = isEnter ? "#1c1c1c" : "#f0f0f0";
      const fg = isEnter ? "#ffffff" : "#111111";
      const side = new THREE.MeshStandardMaterial({ color: isEnter ? 0x333333 : 0xd0d0d0, roughness: 0.5 });
      const front = new THREE.MeshStandardMaterial({ map: keyTexture(LABELS[name] ?? name, bg, fg), roughness: 0.5 });
      const mesh = new THREE.Mesh(
        new RoundedBoxGeometry(KEY_SIZE, KEY_SIZE, KEY_DEPTH, 4, KEY_RADIUS),
        [side, side, side, side, front, side],
      );
      mesh.position.set((c - 1) * KEY_STEP, 0.75 - r * KEY_STEP, baseZ);
      mesh.userData = { key: name, baseZ, pulse: 0 };
      keypad.add(mesh);
      keyMeshes.push(mesh);
      keyByName[name] = mesh;
    });
  });

  // ---------- Lógica de la combinación ----------
  let value = "";
  let busy = false;
  let shakeEnd = 0;
  drawDisplay(value);

  function press(key) {
    if (busy) return;
    if (key === "back") value = removeDigit(value);
    else if (key === "enter") {
      if (value.length === 0) return;
      return submit();
    } else value = addDigit(value, key);
    drawDisplay(value);
    // Si se llenan los 6 dígitos y son incorrectos, se detecta solo
    if (value.length === MAX_DIGITS && !isCorrect(value)) submit();
  }

  function submit() {
    busy = true;
    if (isCorrect(value)) {
      drawDisplay(value, "ok");
      setTimeout(unlock, 700);
    } else {
      shakeEnd = clock.elapsedTime + 0.4;
      // 3 parpadeos rojos (cada uno: 250 ms encendido + 250 ms apagado) y se vacía
      let step = 0;
      const blink = () => {
        if (step >= 6) {
          value = "";
          drawDisplay(value);
          busy = false;
          return;
        }
        drawDisplay(value, step % 2 === 0 ? "error" : "normal");
        step++;
        setTimeout(blink, 250);
      };
      blink();
    }
  }

  function unlock() {
    dom.style.transition = "opacity 0.5s ease";
    dom.style.opacity = "0";
    setTimeout(() => {
      cleanup();
      onUnlock();
    }, 500);
  }

  // ---------- Interacción: ratón / toque ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function keyAt(e) {
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(keyMeshes, false)[0];
    return hit ? hit.object : null;
  }

  let yaw = 0;
  let targetYaw = 0;
  let held = null;
  let moved = false;
  let downX = 0, downY = 0;
  let lastPointer = null;
  const clamp = (v) => Math.max(-MAX_YAW, Math.min(MAX_YAW, v));

  dom.addEventListener("pointerdown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    held = keyAt(e);
  });

  dom.addEventListener("pointermove", (e) => {
    lastPointer = e;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) moved = true;
    // Solo el ratón mueve la cámara. En el móvil lo hace el giroscopio.
    if (e.pointerType === "mouse") {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      targetYaw = -nx * MAX_YAW; // ratón a la izquierda → cámara a la izquierda
    }
  });

  dom.addEventListener("pointerup", (e) => {
    if (held && !moved && keyAt(e) === held) press(held.userData.key);
    held = null;
  });
  dom.addEventListener("pointercancel", () => { held = null; });
  dom.addEventListener("pointerleave", () => { lastPointer = null; });

  // ---------- Interacción: giro del teléfono ----------
  // Panel de diagnóstico: solo aparece si abres la web con ?debug al final
  const debugEl = new URLSearchParams(location.search).has("debug")
    ? document.createElement("div")
    : null;
  if (debugEl) {
    debugEl.style.cssText =
      "position:fixed;top:0;left:0;z-index:20;background:#000c;color:#0f0;" +
      "font:12px monospace;padding:6px;white-space:pre;pointer-events:none";
    document.body.appendChild(debugEl);
  }
  let sensorEvents = 0;
  let lastOri = null;
  let heading0 = null;
  // Hacia dónde apunta la parte trasera del móvil (en el plano horizontal)
  function headingOf(e) {
    const d = Math.PI / 180;
    const a = e.alpha * d, b = e.beta * d, g = e.gamma * d;
    const vx = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
    const vy = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
    if (Math.hypot(vx, vy) < 0.15) return null; // móvil casi plano: lectura poco fiable
    return Math.atan2(vx, vy);
  }
  function onOrientation(e) 
  {
    sensorEvents++;
    lastOri = e;
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    const h = headingOf(e);
    if (h === null) return;
    if (heading0 === null) heading0 = h; // la primera posición es el "centro"
    let diff = h - heading0;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // normaliza a -180°..180°
    targetYaw = clamp(-diff * PHONE_SENSITIVITY * PHONE_DIRECTION);
  }
  window.addEventListener("deviceorientation", onOrientation);

  // iPhone: pide permiso para el movimiento en el primer toque
  let motionAsked = false;
  function askMotion() {
    if (motionAsked) return;
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") {
      motionAsked = true;
      D.requestPermission()
        .then((s) => { if (s !== "granted") motionAsked = false; })
        .catch(() => { motionAsked = false; });
    }
  }
  window.addEventListener("pointerup", askMotion);

  // ---------- Teclado físico (PC) ----------
  function onKey(e) {
    let name = null;
    if (/^[0-9]$/.test(e.key)) name = e.key;
    else if (e.key === "Backspace") name = "back";
    else if (e.key === "Enter") name = "enter";
    if (!name) return;
    e.preventDefault();
    keyByName[name].userData.pulse = 1;
    press(name);
  }
  window.addEventListener("keydown", onKey);

  // ---------- Tamaño de pantalla ----------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // En pantallas estrechas (móvil vertical) ampliamos el campo de visión
    const minAspect = 0.6;
    const half = Math.tan(THREE.MathUtils.degToRad(25));
    camera.fov = camera.aspect < minAspect
      ? THREE.MathUtils.radToDeg(2 * Math.atan((half * minAspect) / camera.aspect))
      : 50;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Bucle de animación ----------
  const clock = new THREE.Clock();
  let raf = 0;
  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = clock.elapsedTime;

    yaw += (targetYaw - yaw) * SMOOTH;
    camera.rotation.y = yaw;

    for (const k of keyMeshes) {
      const d = k.userData;
      d.pulse = Math.max(0, d.pulse - dt * 8);
      const depth = k === held ? 1 : d.pulse;
      k.position.z += (d.baseZ - depth * KEY_TRAVEL - k.position.z) * 0.4;
    }

    const shake = Math.max(0, shakeEnd - now) / 0.4;
    keypad.position.x = Math.sin(now * 60) * 0.08 * shake;

    dom.style.cursor = lastPointer && keyAt(lastPointer) ? "pointer" : "default";

    if (debugEl) {
    debugEl.textContent =
      `https/seguro: ${window.isSecureContext}\n` +
      `eventos del sensor: ${sensorEvents}\n` +
      `alpha: ${lastOri ? lastOri.alpha?.toFixed(0) : "-"}  beta: ${lastOri ? lastOri.beta?.toFixed(0) : "-"}  gamma: ${lastOri ? lastOri.gamma?.toFixed(0) : "-"}\n` +
      `yaw: ${(yaw * 180 / Math.PI).toFixed(0)}°`;
    }
    
    renderer.render(scene, camera);
  }
  animate();

  // ---------- Limpieza al desbloquear ----------
  function cleanup() {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("pointerup", askMotion);
    if (debugEl) debugEl.remove();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
    renderer.dispose();
    dom.remove();
  }
}