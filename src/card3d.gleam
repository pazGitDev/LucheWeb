const pi = 3.141592653589793

// Cada clic suma media vuelta (180°) al ángulo actual.
fn next_angle(current: Float) -> Float {
  current +. pi
}

@external(javascript, "./card_ffi.mjs", "start")
fn start(
  image_url: String,
  back_text: String,
  next_angle: fn(Float) -> Float,
) -> Nil

pub fn main() -> Nil {
  start(
    "imagen.jpg",
    "Aquí va el texto de la cara trasera de la tarjeta. Cámbialo por lo que quieras.",
    next_angle,
  )
}