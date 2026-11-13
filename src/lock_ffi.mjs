const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "enter"];
const LABELS = { back: "⌫", enter: "↵" };

export function show_lock(addDigit, removeDigit, isCorrect, onUnlock) {
  let value = "";
  let busy = false;

  // --- Construir el recuadro ---
  const overlay = document.createElement("div");
  overlay.className = "lock-overlay";

  const box = document.createElement("div");
  box.className = "lock-box";

  const input = document.createElement("input");
  input.className = "lock-input";
  input.type = "text";
  input.readOnly = true; // evita que salga el teclado nativo del móvil
  input.setAttribute("inputmode", "none");
  input.placeholder = "······";
  input.setAttribute("aria-label", "Combinación");

  const pad = document.createElement("div");
  pad.className = "lock-keys";

  for (const key of KEYS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.tabIndex = -1;
    btn.className = "lock-key" + (key === "enter" ? " lock-key-enter" : "");
    btn.textContent = LABELS[key] ?? key;
    btn.setAttribute("aria-label", key === "back" ? "Borrar" : key === "enter" ? "Aceptar" : key);
    btn.addEventListener("mousedown", (e) => e.preventDefault()); // no robar el foco
    btn.addEventListener("click", () => press(key));
    pad.appendChild(btn);
  }

  box.append(input, pad);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // --- Lógica de pulsaciones ---
  function render() {
    input.value = value;
  }

  function press(key) {
    if (busy) return;
    if (key === "back") value = removeDigit(value);
    else if (key === "enter") submit();
    else value = addDigit(value, key);
    render();
  }

  function submit() {
    busy = true;
    if (isCorrect(value)) {
      overlay.classList.add("lock-hide");
      setTimeout(() => {
        window.removeEventListener("keydown", onKey);
        overlay.remove();
        onUnlock();
      }, 400);
    } else {
      overlay.classList.add("lock-error");
      setTimeout(() => {
        value = "";
        render();
        overlay.classList.remove("lock-error");
        busy = false;
      }, 500);
    }
  }

  // --- Teclado físico (PC) ---
  function onKey(e) {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("back");
    else if (e.key === "Enter") press("enter");
    else return;
    e.preventDefault();
  }
  window.addEventListener("keydown", onKey);
}