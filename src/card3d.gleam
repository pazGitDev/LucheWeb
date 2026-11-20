import gleam/string

const pi = 3.141592653589793

const secret = "250825"

const max_digits = 6

// ✏️ Textos de los papeles (usa \n para saltos de línea)
const left_note =
  "Escribe aquí el mensaje del papel izquierdo.\n\nPuedes usar varias líneas."

const right_note = "Escribe aquí el mensaje del papel derecho."

// Cada clic suma media vuelta (180°) al ángulo actual.
fn next_angle(current: Float) -> Float {
  current +. pi
}

fn add_digit(current: String, digit: String) -> String {
  case string.length(current) < max_digits {
    True -> current <> digit
    False -> current
  }
}

fn remove_digit(current: String) -> String {
  string.drop_end(current, 1)
}

fn is_correct(code: String) -> Bool {
  code == secret
}

@external(javascript, "./lock_ffi.mjs", "show_lock")
fn show_lock(
  left_note: String,
  right_note: String,
  add_digit: fn(String, String) -> String,
  remove_digit: fn(String) -> String,
  is_correct: fn(String) -> Bool,
  on_unlock: fn() -> Nil,
) -> Nil

@external(javascript, "./card_ffi.mjs", "start")
fn start(
  image_url: String,
  back_text: String,
  next_angle: fn(Float) -> Float,
) -> Nil

pub fn main() -> Nil {
  show_lock(left_note, right_note, add_digit, remove_digit, is_correct, fn() {
    start(
      "imagen.jpg",
      "Aquí va el texto de la cara trasera de la tarjeta. Cámbialo por lo que quieras.",
      next_angle,
    )
  })
}
