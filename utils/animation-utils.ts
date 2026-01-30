import { MovePointAlongOrbitParams, Point } from "./animation-utils.types";

export function movePointAlongOrbit({
  center,
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
