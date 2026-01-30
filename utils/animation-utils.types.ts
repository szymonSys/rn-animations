export type Point = {
  x: number;
  y: number;
};

export type MovePointAlongOrbitParams = {
  center: Point;
  elapsedTime: number;
  orbitalPeriod: number;
  radius: number;
};
