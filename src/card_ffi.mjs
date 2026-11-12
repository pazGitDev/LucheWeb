import * as THREE from "three";

const CARD_W = 2;
const CARD_H = 3;
const CARD_D = 0.02;
const TEX_W = 1024;
const TEX_H = 1536;
const MARGIN = 80;
const GREY = "#f0f0f0";

function makeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  return canvas;
}

function makeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Cara delantera: marco blanco + imagen (recortada tipo "cover")
function frontTexture(url) {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  const texture = makeTexture(canvas);
  const x = MARGIN, y = MARGIN, w = TEX_W - 2 * MARGIN, h = TEX_H - 2 * MARGIN;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.fillStyle = GREY;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#000";
  ctx.font = "56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Imagen aquí", TEX_W / 2, TEX_H / 2);

  const img = new Image();
  img.onload = () => {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    texture.needsUpdate = true;
  };
  img.src = url;
  return texture;
}

// Cara trasera: marco blanco + texto centrado con salto de línea automático
function backTexture(text) {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  const texture = makeTexture(canvas);
  const x = MARGIN, y = MARGIN, w = TEX_W - 2 * MARGIN, h = TEX_H - 2 * MARGIN;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.fillStyle = GREY;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "#111";
  ctx.font = "60px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = w - 120;
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);

  const lineHeight = 84;
  const startY = TEX_H / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, TEX_W / 2, startY + i * lineHeight));

  return texture;
}

export function start(imageUrl, backText, nextAngle) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const materials = [
    white, // +x
    white, // -x
    white, // +y
    white, // -y
    new THREE.MeshBasicMaterial({ map: frontTexture(imageUrl) }), // +z (delante)
    new THREE.MeshBasicMaterial({ map: backTexture(backText) }), // -z (detrás)
  ];
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D),
    materials,
  );
  scene.add(card);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    renderer.setSize(w, h);
    camera.aspect = aspect;
    // En pantallas estrechas (móvil) alejamos la cámara para que quepa la tarjeta
    camera.position.z = 6.5 * Math.max(1, 0.7 / aspect);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // Detección de clic sobre la tarjeta
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function isOverCard(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(card).length > 0;
  }

  let target = 0; // ángulo objetivo (lo calcula Gleam)
  renderer.domElement.addEventListener("click", (e) => {
    if (isOverCard(e)) target = nextAngle(target);
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    renderer.domElement.style.cursor = isOverCard(e) ? "pointer" : "default";
  });

  const clock = new THREE.Clock();

  function animate() {
    const t = clock.getElapsedTime();

    card.rotation.y += (target - card.rotation.y) * 0.08; // giro suave
    card.position.y = Math.sin(t * 1.2) * 0.12;           // flotación
    card.rotation.x = Math.sin(t * 0.8) * 0.04;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}