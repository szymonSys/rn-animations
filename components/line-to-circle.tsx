import { Point } from "@/utils/animation-utils.types";
import { useEffect } from "react";
import { View, StyleSheet, Dimensions, Button } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 3;
const VIEW_BOX = `0 0 ${CENTER_X} ${CENTER_X}`;

const TARGET_RADIUS = 30;
const LINE_LENGTH = 2 * Math.PI * TARGET_RADIUS;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function _normalizeOffset(_offset: Point | number): Point {
  "worklet";
  return typeof _offset === "number" ? { x: _offset, y: _offset } : _offset;
}

function calculateBendingBreakpoints(
  progress: number,
  arcLengthMultiplier: number = 0.6,
  finalRadius: number = TARGET_RADIUS,
  finalCenter: Point | number = CENTER_X / 2,
  numberOfBreakpoints: number = 100
): Point[] {
  "worklet";
  const clampedProgress = Math.max(progress, 0.005);
  const arcLength = 2 * Math.PI * finalRadius;
  const minArcLength = arcLength * arcLengthMultiplier;
  const scaledArcLength =
    minArcLength + (arcLength - minArcLength) * clampedProgress;
  const totalAngle = 2 * Math.PI * clampedProgress;
  const currentRadius = scaledArcLength / totalAngle;
  const normalizedCenter = _normalizeOffset(finalCenter);
  const arcCenterX = normalizedCenter.x;
  const arcCenterY = normalizedCenter.y - finalRadius + currentRadius;

  const startAngle = -Math.PI / 2 - totalAngle / 2;

  const breakpoints: Point[] = [];
  for (let i = 0; i <= numberOfBreakpoints; i++) {
    const t = i / numberOfBreakpoints;
    const angle = startAngle + t * totalAngle;
    breakpoints.push({
      x: Math.cos(angle) * currentRadius + arcCenterX,
      y: Math.sin(angle) * currentRadius + arcCenterY,
    });
  }

  return breakpoints;
}

function calculateLineBreakpoints(
  length: number = LINE_LENGTH,
  _center: Point | number = CENTER_X / 2,
  angleDeg: number = 0,
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

function calculateCircleBreakpoints(
  maxAngleDeg: number = 360,
  radius: number = TARGET_RADIUS,
  center: Point | number = CENTER_X / 2,
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

function interpolateBreakpoints(
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

function drawPath(breakpoints: Point[]): string {
  "worklet";
  let path = `M ${breakpoints[0].x},${breakpoints[0].y}`;
  for (let i = 1; i < breakpoints.length; i++) {
    path += ` L ${breakpoints[i].x},${breakpoints[i].y}`;
  }
  return path;
}

const CIRCLE_BREAKPOINTS = calculateCircleBreakpoints();
const LINE_BREAKPOINTS = calculateLineBreakpoints(120);

export function LineToCircle() {
  const bendingProgress = useSharedValue(0);
  const animatedPathProps = useAnimatedProps(() => {
    const path = drawPath(calculateBendingBreakpoints(bendingProgress.value));
    return {
      d: path,
    };
  }, []);

  const startAnimation = () => {
    bendingProgress.value = 0;
    bendingProgress.value = withTiming(1, { duration: 3000 });
  };

  useEffect(() => {
    startAnimation();
  }, []);

  return (
    <View style={styles.container}>
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_WIDTH}
        style={styles.svg}
        viewBox={VIEW_BOX}
      >
        <AnimatedPath
          animatedProps={animatedPathProps}
          stroke="red"
          strokeWidth={1}
        />
      </Svg>
      <Button title="Start Animation" onPress={startAnimation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    flex: 1,
    width: "100%",
    height: "100%",
  },
  svg: { backgroundColor: "black" },
});
