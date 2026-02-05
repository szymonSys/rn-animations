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

const AnimatedPath = Animated.createAnimatedComponent(Path);

function calculateBendingBreakpoints(
  progress: number,
  arcLengthMultiplier: number = 0.6,
  finalRadius: number = TARGET_RADIUS,
  finalCenter: Point = { x: CENTER_X / 2, y: CENTER_X / 2 },
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
  const arcCenterX = finalCenter.x;
  const arcCenterY = finalCenter.y - finalRadius + currentRadius;

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

function drawPath(breakpoints: Point[]): string {
  "worklet";
  let path = `M ${breakpoints[0].x},${breakpoints[0].y}`;
  for (let i = 1; i < breakpoints.length; i++) {
    path += ` L ${breakpoints[i].x},${breakpoints[i].y}`;
  }
  return path;
}

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
