import { moveSidePointAlongOrbit } from "@/utils/animation-utils";
import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SKY_CENTER_Y = SCREEN_HEIGHT * 0.5;
const SKY_CENTER_X = SCREEN_WIDTH * 0.5;

const SUN_CENTER_X = SKY_CENTER_X;
const SUN_CENTER_Y = SKY_CENTER_Y;

const SUN_DIAMETER = SCREEN_WIDTH * 0.2;
const EARTH_DIAMETER = SUN_DIAMETER * 0.25;
const MOON_DIAMETER = EARTH_DIAMETER * 0.35;

const EARTH_ORBIT_RADIUS = SUN_DIAMETER * 1.8;
const MOON_ORBIT_RADIUS = EARTH_DIAMETER * 1.6;

const EARTH_ORBITAL_PERIOD_MS = 6000;
const MOON_ORBITAL_PERIOD_MS = 1200;

const OBSERVER_TILT_DEG = -10;

const SUN_Z_INDEX = 100;
const EARTH_Z_INDEX_FRONT = 150;
const EARTH_Z_INDEX_BACK = 50;
const MOON_Z_INDEX_FRONT = 200;
const MOON_Z_INDEX_BACK_OF_EARTH = 125;
const MOON_Z_INDEX_BACK_OF_SUN = 25;

export type SolarSystemSidePerspectiveProps = {
  isActive?: boolean;
};

export default function SolarSystemSidePerspective({
  isActive = true,
}: SolarSystemSidePerspectiveProps) {
  const earthScreenX = useSharedValue(0);
  const earthScreenY = useSharedValue(0);
  const earthDepth = useSharedValue(0);

  const moonScreenY = useSharedValue(0);
  const moonDepth = useSharedValue(0);

  const moonAbsoluteX = useSharedValue(0);
  const moonAbsoluteY = useSharedValue(0);
  const moonAbsoluteDepth = useSharedValue(0);

  const frameCallback = useFrameCallback((frame) => {
    const earthOrbit = moveSidePointAlongOrbit({
      elapsedTime: frame.timeSinceFirstFrame,
      orbitalPeriod: EARTH_ORBITAL_PERIOD_MS,
      radius: EARTH_ORBIT_RADIUS,
      observerTiltDeg: OBSERVER_TILT_DEG,
    });

    earthScreenX.set(earthOrbit.x);
    earthScreenY.set(earthOrbit.y);
    earthDepth.set(earthOrbit.z);

    const moonOrbit = moveSidePointAlongOrbit({
      elapsedTime: frame.timeSinceFirstFrame,
      orbitalPeriod: MOON_ORBITAL_PERIOD_MS,
      radius: MOON_ORBIT_RADIUS,
      observerTiltDeg: OBSERVER_TILT_DEG,
    });

    moonScreenY.set(moonOrbit.y);
    moonDepth.set(moonOrbit.z);
    moonAbsoluteX.set(earthOrbit.x + moonOrbit.x);
    moonAbsoluteY.set(earthOrbit.y + moonOrbit.y);
    moonAbsoluteDepth.set(earthOrbit.z + moonOrbit.z);
  }, false);

  useEffect(() => {
    frameCallback.setActive(isActive);
    return () => frameCallback.setActive(false);
  }, [frameCallback, isActive]);

  const earthAnimatedStyle = useAnimatedStyle(() => {
    const zIndex =
      earthDepth.get() > 0 ? EARTH_Z_INDEX_BACK : EARTH_Z_INDEX_FRONT;

    return {
      transform: [
        { translateX: earthScreenX.get() },
        { translateY: earthScreenY.get() },
      ],
      zIndex,
    };
  });

  const moonAnimatedStyle = useAnimatedStyle(() => {
    const absX = moonAbsoluteX.get();
    const absDepth = moonAbsoluteDepth.get();
    const earthDep = earthDepth.get();

    const moonDepthRelativeToEarth = moonDepth.get();

    let zIndex = MOON_Z_INDEX_FRONT;
    if (absDepth > 0) {
      if (moonDepthRelativeToEarth > 0) {
        zIndex = MOON_Z_INDEX_BACK_OF_SUN;
      } else {
        zIndex = MOON_Z_INDEX_BACK_OF_EARTH;
      }
    } else {
      if (moonDepthRelativeToEarth > 0 && earthDep <= 0) {
        zIndex = EARTH_Z_INDEX_FRONT - 1;
      } else {
        zIndex = MOON_Z_INDEX_FRONT;
      }
    }

    return {
      transform: [{ translateX: absX }, { translateY: moonAbsoluteY.get() }],
      zIndex,
    };
  });

  return (
    <View style={styles.sky}>
      <View style={[styles.celestialBody, styles.sun]} />
      <Animated.View
        style={[styles.celestialBody, styles.earth, earthAnimatedStyle]}
      />
      <Animated.View
        style={[styles.celestialBody, styles.moon, moonAnimatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    flex: 1,
    backgroundColor: "#0a0a1a",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  celestialBody: {
    position: "absolute",
    borderRadius: 1000,
  },
  sun: {
    width: SUN_DIAMETER,
    height: SUN_DIAMETER,
    left: SUN_CENTER_X - SUN_DIAMETER / 2,
    top: SUN_CENTER_Y - SUN_DIAMETER / 2,
    backgroundColor: "#FFD700",
    shadowColor: "#FFA500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    zIndex: SUN_Z_INDEX,
  },
  earth: {
    width: EARTH_DIAMETER,
    height: EARTH_DIAMETER,
    left: SUN_CENTER_X - EARTH_DIAMETER / 2,
    top: SUN_CENTER_Y - EARTH_DIAMETER / 2,
    backgroundColor: "#4A90D9",
    shadowColor: "#4A90D9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  moon: {
    width: MOON_DIAMETER,
    height: MOON_DIAMETER,
    left: SUN_CENTER_X - MOON_DIAMETER / 2,
    top: SUN_CENTER_Y - MOON_DIAMETER / 2,
    backgroundColor: "#E8E8E8",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
