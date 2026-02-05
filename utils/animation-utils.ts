import {
  MovePointAlongOrbitParams,
  MoveSidePointAlongOrbitParams,
  Point,
  Point3D,
} from "./animation-utils.types";

export function movePointAlongOrbit({
  center = { x: 0, y: 0 },
  elapsedTime,
  orbitalPeriod,
  radius,
}: MovePointAlongOrbitParams): Point {
  "worklet";
  const angle = (elapsedTime / orbitalPeriod) * 2 * Math.PI;
  const x = Math.cos(angle) * radius + center.x;
  const y = Math.sin(angle) * radius + center.y;
  return { x, y };
}

export function moveSidePointAlongOrbit({
  center = { x: 0, y: 0 },
  observerTiltDeg = 0,
  ...movePointAlongOrbitParams
}: MoveSidePointAlongOrbitParams): Point3D {
  "worklet";
  const { x, y } = movePointAlongOrbit({
    ...movePointAlongOrbitParams,
    center,
  });
  const observerTiltRad = (observerTiltDeg * Math.PI) / 180;
  const tiltSin = Math.sin(observerTiltRad);
  const tiltCos = Math.cos(observerTiltRad);
  return { x, y: y * tiltSin, z: y * tiltCos };
}

export function calculateLineBreakpoints(
  length: number,
  _center: Point | number,
  angleDeg: number,
  numberOfBreakpoints: number = 100
): Point[] {
  "worklet";
  const angleRad = (angleDeg * Math.PI) / 180;
  const breakpoints: Point[] = [];
  const center = _normalizeOffset(_center);
  for (let i = 0; i <= numberOfBreakpoints; i++) {
    const t = i / numberOfBreakpoints;
    const x = center.x - length * 0.5 + Math.cos(angleRad) * length * t;
    const y = center.y + Math.sin(angleRad) * length * t;
    breakpoints.push({ x, y });
  }
  return breakpoints;
}

export function calculateCircleBreakpoints(
  maxAngleDeg: number,
  radius: number,
  center: Point | number,
  numberOfBreakpoints: number = 100
): Point[] {
  "worklet";
  const breakpoints: Point[] = [];
  const angleMaxRad = (maxAngleDeg * Math.PI) / 180;
  const offset = _normalizeOffset(center);
  for (let i = 0; i <= numberOfBreakpoints; i++) {
    const angle = (i / numberOfBreakpoints) * angleMaxRad;
    const x = Math.cos(angle) * radius + offset.x;
    const y = Math.sin(angle) * radius + offset.y;
    breakpoints.push({ x, y });
  }
  return breakpoints;
}

export function interpolateBreakpoints(
  progress: number,
  from: Point[],
  to: Point[]
): Point[] {
  "worklet";
  const interpolatedBreakpoints: Point[] = [];
  for (let i = 0; i < from.length; i++) {
    const fromPoint = from[i];
    const toPoint = to[i];
    const x = fromPoint.x + (toPoint.x - fromPoint.x) * progress;
    const y = fromPoint.y + (toPoint.y - fromPoint.y) * progress;
    interpolatedBreakpoints.push({ x, y });
  }
  return interpolatedBreakpoints;
}

function _normalizeOffset(_offset: Point | number): Point {
  "worklet";
  return typeof _offset === "number" ? { x: _offset, y: _offset } : _offset;
}
