import { Point } from "@/utils/animation-utils.types";
import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

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

function runOrbitalAnimation(orbitalPeriod: number): number {
  "worklet";
  return withRepeat(
    withTiming(2 * Math.PI, {
      duration: orbitalPeriod,
      easing: Easing.linear,
    }),
    -1,
    false
  );
}

function calculateCoordinates(params: {
  angle: number;
  radius: number;
  center: Point;
  offset?: Point;
}): Point {
  "worklet";
  const { angle, radius, center, offset = { x: 0, y: 0 } } = params;
  return {
    x: radius * Math.cos(angle) + center.x + offset.x,
    y: radius * Math.sin(angle) + center.y + offset.y,
  };
}

export type SolarSystemTopDownProps = {
  isActive?: boolean;
};

export default function SolarSystemTopDown({
  isActive = true,
}: SolarSystemTopDownProps) {
  const sunAngle = useSharedValue(0);
  const earthAngle = useSharedValue(0);

  const earthCoordinates = useDerivedValue(() =>
    calculateCoordinates({
      angle: sunAngle.get(),
      radius: SUN_ORBIT_RADIUS,
      center: { x: SUN_CENTER_X, y: SUN_CENTER_Y },
      offset: { x: -EARTH_DIAMETER * 0.5, y: -EARTH_DIAMETER * 0.5 },
    })
  );

  const moonCoordinates = useDerivedValue(() =>
    calculateCoordinates({
      angle: earthAngle.get(),
      radius: EARTH_ORBIT_RADIUS,
      center: earthCoordinates.get(),
      offset: {
        x: EARTH_DIAMETER * 0.5 - MOON_DIAMETER * 0.5,
        y: EARTH_DIAMETER * 0.5 - MOON_DIAMETER * 0.5,
      },
    })
  );

  useEffect(() => {
    scheduleOnUI(() => {
      sunAngle.set(runOrbitalAnimation(SUN_ORBITAL_PERIOD_IN_MS));
      earthAngle.set(runOrbitalAnimation(EARTH_ORBITAL_PERIOD_IN_MS));
    });
  }, []);

  const earthAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: earthCoordinates.get().x },
      { translateY: earthCoordinates.get().y },
    ],
  }));

  const moonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: moonCoordinates.get().x },
      { translateY: moonCoordinates.get().y },
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
