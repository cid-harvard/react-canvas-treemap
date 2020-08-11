precision highp float;

// non-instanced attributes:
attribute vec2 referencePosition;

// instanced attributes:
// with different initial and final states:
attribute vec2 initialTopLeft;
attribute vec2 finalTopLeft;

attribute vec2 initialBottomRight;
attribute vec2 finalBottomRight;

attribute vec4 initialColor;
attribute vec4 finalColor;
// with the same initial and final states:
attribute float halfStrokeWidth;

uniform vec2 canvasSize;
uniform float tweenProgress;

varying vec4 colorForFragment;

vec2 normalizePosition(vec2 unnormalizedPosition, vec2 inputCanvasSize) {
  return (unnormalizedPosition / inputCanvasSize * vec2(2, 2) - vec2(1.0, 1.0)) * vec2(1.0, -1.0);
}

vec2 getPositionWithStroke(vec2 inputBottomRight, vec2 inputTopLeft) {
  vec2 positionWithoutStroke = mix(inputBottomRight, inputTopLeft, referencePosition);
  return positionWithoutStroke + (2.0 * referencePosition - vec2(1.0, 1.0)) * halfStrokeWidth;
}

void main() {
  vec2 initialPosition = getPositionWithStroke(initialBottomRight, initialTopLeft);
  vec2 finalPosition = getPositionWithStroke(finalBottomRight, finalTopLeft);
  vec2 tweenedPosition = mix(initialPosition, finalPosition, tweenProgress);
  vec2 normalized = normalizePosition(tweenedPosition, canvasSize);

  gl_Position = vec4(normalized, 0, 1);

  colorForFragment = mix(initialColor, finalColor, tweenProgress);
}


