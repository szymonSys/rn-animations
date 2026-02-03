export type Point = {
  x: number;
  y: number;
};

export type Point3D = Point & {
  z: number;
};

export type MovePointAlongOrbitParams = {
  center?: Point;
  elapsedTime: number;
  orbitalPeriod: number;
  radius: number;
};

export type MoveSidePointAlongOrbitParams = MovePointAlongOrbitParams & {
  observerTiltDeg?: number;
};
