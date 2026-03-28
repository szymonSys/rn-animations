import { StyleSheet, View } from "react-native";
import Animated, {
  SensorType,
  clamp,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const CHANGE_THRESHOLD = 0.01;
const SENSOR_INTERVAL_MS = 10;
const CHANGE_THRESHOLD_RADIANS = CHANGE_THRESHOLD * 2 * Math.PI;

function toPrecision(value: number, precision: number = 1): number {
  "worklet";
  const base = Math.pow(10, precision);
  return Math.round(value * base) / base;
}

function normalizeRadians(angle: number): number {
  "worklet";
  const twoPi = Math.PI * 2;
  let normalized = (angle + Math.PI) % twoPi;
  if (normalized < 0) {
    normalized += twoPi;
  }
  return normalized - Math.PI;
}

function adjustRotationValue(
  previousValue: number | null,
  currentValue: number
): number {
  "worklet";
  if (previousValue === null) {
    return normalizeRadians(currentValue);
  }
  const delta = normalizeRadians(currentValue - previousValue);
  if (Math.abs(delta) <= CHANGE_THRESHOLD_RADIANS) {
    return previousValue;
  }
  return previousValue + delta;
}

function calculateYawFromGyroscope(gyroscopeValue: number, currentYaw: number) {
  "worklet";
  return currentYaw + gyroscopeValue * (SENSOR_INTERVAL_MS / 1000);
}

export function Sensors() {
  const { sensor } = useAnimatedSensor(SensorType.GYROSCOPE, {
    interval: SENSOR_INTERVAL_MS,
  });
  const previousYaw = useSharedValue<number | null>(null);
  const accumulatedYaw = useSharedValue(0);
  const baselineYaw = useSharedValue<number | null>(null);

  const currentYaw = useDerivedValue(() => {
    accumulatedYaw.value = calculateYawFromGyroscope(
      sensor.value.z,
      accumulatedYaw.value
    );
    const rawYaw = adjustRotationValue(previousYaw.value, accumulatedYaw.value);
    if (rawYaw !== previousYaw.value) {
      previousYaw.value = rawYaw;
    }
    if (baselineYaw.value === null) {
      baselineYaw.value = rawYaw;
    }
    return normalizeRadians(rawYaw - baselineYaw.value);
  });

  const animatedYaw = useDerivedValue(() => {
    return withSpring(clamp(currentYaw.value, -Math.PI / 2, Math.PI / 2));
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-toPrecision(animatedYaw.value, 2)}rad` }],
  }));

  const treeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${toPrecision(animatedYaw.value, 2)}rad` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[animatedStyle, styles.ground]}></Animated.View>
      <Animated.View
        style={[styles.sharedTree, styles.tree1, treeAnimatedStyle]}
      />
      <Animated.View
        style={[styles.sharedTree, styles.tree2, treeAnimatedStyle]}
      />
      <Animated.View
        style={[styles.sharedTree, styles.tree3, treeAnimatedStyle]}
      />
      <Animated.View
        style={[styles.sharedTree, styles.tree4, treeAnimatedStyle]}
      />
      <Animated.View
        style={[styles.sharedTree, styles.tree5, treeAnimatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "skyblue",
  },
  ground: {
    width: 800,
    height: 800,
    backgroundColor: "green",
    position: "absolute",
    borderRadius: 350,
    bottom: -600,
    left: "-50%",
  },
  sharedTree: {
    position: "absolute",
    backgroundColor: "brown",
    width: 32,
    height: 360,
  },
  tree1: {
    bottom: 30,
    left: 30,
  },
  tree2: {
    bottom: 18,
    left: 86,
  },
  tree3: {
    bottom: 42,
    left: 138,
  },
  tree4: {
    bottom: 66,
    left: 192,
  },
  tree5: {
    bottom: 48,
    left: 248,
  },
});
