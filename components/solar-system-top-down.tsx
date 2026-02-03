import { movePointAlongOrbit } from "@/utils/animation-utils";
import { Point } from "@/utils/animation-utils.types";
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

const SUN_DIAMETER = SCREEN_WIDTH * 0.25;
const EARTH_DIAMETER = SUN_DIAMETER * 0.3;
const MOON_DIAMETER = EARTH_DIAMETER * 0.3;

const SUN_ORBIT_RADIUS = SUN_DIAMETER * 1.5;
const EARTH_ORBIT_RADIUS = EARTH_DIAMETER * 1.5;

const SUN_ORBITAL_PERIOD_IN_MS = 5000;
const EARTH_ORBITAL_PERIOD_IN_MS = 1000;

function animateEarth({ elapsedTime }: { elapsedTime: number }): Point {
  "worklet";
  return movePointAlongOrbit({
    center: {
      x: SUN_CENTER_X - EARTH_DIAMETER * 0.5,
      y: SUN_CENTER_Y - EARTH_DIAMETER * 0.5,
    },
    elapsedTime,
    orbitalPeriod: SUN_ORBITAL_PERIOD_IN_MS,
    radius: SUN_ORBIT_RADIUS,
  });
}

function animateMoon({
  elapsedTime,
  earthCoordinates,
}: {
  elapsedTime: number;
  earthCoordinates: Point;
}): Point {
  "worklet";
  return movePointAlongOrbit({
    center: {
      x: earthCoordinates.x + EARTH_DIAMETER * 0.5 - MOON_DIAMETER * 0.5,
      y: earthCoordinates.y + EARTH_DIAMETER * 0.5 - MOON_DIAMETER * 0.5,
    },
    elapsedTime,
    orbitalPeriod: EARTH_ORBITAL_PERIOD_IN_MS,
    radius: EARTH_ORBIT_RADIUS,
  });
}

export type SolarSystemTopDownProps = {
  isActive?: boolean;
};

export default function SolarSystemTopDown({
  isActive = true,
}: SolarSystemTopDownProps) {
  const earthOffsetX = useSharedValue(
    SUN_CENTER_X - SUN_ORBIT_RADIUS + EARTH_DIAMETER * 0.5
  );
  const earthOffsetY = useSharedValue(
    SUN_CENTER_Y - SUN_ORBIT_RADIUS + EARTH_DIAMETER * 0.5
  );

  const moonOffsetX = useSharedValue(
    earthOffsetX.get() - EARTH_ORBIT_RADIUS + MOON_DIAMETER * 0.5
  );
  const moonOffsetY = useSharedValue(
    earthOffsetY.get() - EARTH_ORBIT_RADIUS + MOON_DIAMETER * 0.5
  );

  const frameCallback = useFrameCallback((frame) => {
    const earthCoordinates = animateEarth({
      elapsedTime: frame.timeSinceFirstFrame,
    });
    const moonCenter = animateMoon({
      elapsedTime: frame.timeSinceFirstFrame,
      earthCoordinates,
    });
    earthOffsetX.set(earthCoordinates.x);
    earthOffsetY.set(earthCoordinates.y);
    moonOffsetX.set(moonCenter.x);
    moonOffsetY.set(moonCenter.y);
  }, false);

  useEffect(() => {
    frameCallback.setActive(isActive);
    return () => frameCallback.setActive(false);
  }, [frameCallback, isActive]);

  const earthAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: earthOffsetY.get() },
      { translateX: earthOffsetX.get() },
    ],
  }));

  const moonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: moonOffsetY.get() },
      { translateX: moonOffsetX.get() },
    ],
  }));

  return (
    <View style={[styles.sky]}>
      <View style={[styles.shared, styles.sun]}></View>
      <Animated.View
        style={[styles.shared, styles.earth, earthAnimatedStyle]}
      />
      <Animated.View style={[styles.shared, styles.moon, moonAnimatedStyle]} />
    </View>
  );
}

const SUN_X = SUN_CENTER_X - SUN_DIAMETER * 0.5;
const SUN_Y = SUN_CENTER_Y - SUN_DIAMETER * 0.5;

const styles = StyleSheet.create({
  sky: {
    flex: 1,
    backgroundColor: "black",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
  },
  sun: {
    top: SUN_Y,
    left: SUN_X,
    width: SUN_DIAMETER,
    height: SUN_DIAMETER,
    backgroundColor: "gold",
  },
  earth: {
    top: 0,
    left: 0,
    width: EARTH_DIAMETER,
    height: EARTH_DIAMETER,
    backgroundColor: "skyblue",
  },
  moon: {
    width: MOON_DIAMETER,
    height: MOON_DIAMETER,
    top: 0,
    left: 0,
    backgroundColor: "white",
  },
  shared: {
    borderRadius: 1000,
    position: "absolute",
    top: 0,
    left: 0,
  },
});
