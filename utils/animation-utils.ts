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
