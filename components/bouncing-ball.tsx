import { View, StyleSheet } from "react-native";
import Animated, {
  WithDecayConfig,
  cancelAnimation,
  clamp,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Point } from "@/utils/animation-utils.types";

type WallsPositions = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

const BALL_DIAMETER = 64;
const DECELERATION_RATE = 0.998;
const VELOCITY_FACTOR = 0.8;

const DECAY_BASE_OPTIONS: WithDecayConfig = {
  deceleration: DECELERATION_RATE,
  velocityFactor: VELOCITY_FACTOR,
  rubberBandEffect: false,
} as const;

function getDecayOptions(
  wallsPositions: WallsPositions,
  velocity: number,
  axis: "x" | "y"
): WithDecayConfig {
  "worklet";
  if (axis === "x") {
    return {
      ...DECAY_BASE_OPTIONS,
      velocity,
      clamp: [wallsPositions.left, wallsPositions.right - BALL_DIAMETER],
    };
  }
  return {
    ...DECAY_BASE_OPTIONS,
    velocity,
    clamp: [wallsPositions.top, wallsPositions.bottom - BALL_DIAMETER],
  };
}

export default function BouncingBall() {
  const ballY = useSharedValue(0);
  const ballX = useSharedValue(0);
  const ballStartingPosition = useSharedValue<Point>({
    x: ballX.value,
    y: ballY.value,
  });
  const velocityY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const wallsPositions = useSharedValue<WallsPositions>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const gestureIsActive = useSharedValue(false);

  const ballRef = useAnimatedRef<View>();

  useAnimatedReaction(
    () => ballX.value,
    (x, prevX) => {
      if (prevX === null || gestureIsActive.value) {
        return;
      }
      // @ts-ignore-next-line
      const velocity: number = ballX._animation.velocity;
      if (x <= wallsPositions.value.left && x !== prevX) {
        cancelAnimation(ballX);
        velocityX.value = Math.abs(velocity);
        ballX.value = withDecay(
          getDecayOptions(wallsPositions.value, velocityX.value, "x")
        );
      }
      if (x >= wallsPositions.value.right - BALL_DIAMETER && x !== prevX) {
        cancelAnimation(ballX);
        velocityX.value = -Math.abs(velocity);
        ballX.value = withDecay(
          getDecayOptions(wallsPositions.value, velocityX.value, "x")
        );
      }
    }
  );

  useAnimatedReaction(
    () => ballY.value,
    (y, prevY) => {
      if (prevY === null || gestureIsActive.value) {
        return;
      }
      // @ts-ignore-next-line
      const velocity: number = ballY._animation.velocity;
      if (y <= wallsPositions.value.top && y !== prevY) {
        cancelAnimation(ballY);
        velocityY.value = Math.abs(velocity);
        ballY.value = withDecay(
          getDecayOptions(wallsPositions.value, velocityY.value, "y")
        );
      }
      if (y >= wallsPositions.value.bottom - BALL_DIAMETER && y !== prevY) {
        cancelAnimation(ballY);
        velocityY.value = -Math.abs(velocity);
        ballY.value = withDecay(
          getDecayOptions(wallsPositions.value, velocityY.value, "y")
        );
      }
    }
  );

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      gestureIsActive.value = true;
      const measurements = measure(ballRef);
      if (measurements) {
        wallsPositions.value = {
          top: measurements.y,
          bottom: measurements.y + measurements.height,
          left: measurements.x,
          right: measurements.x + measurements.width,
        };
      }
      ballStartingPosition.value = {
        x: ballX.value,
        y: ballY.value,
      };
    })
    .onUpdate((e) => {
      const y = clamp(
        ballStartingPosition.value.y + e.translationY,
        wallsPositions.value.top,
        wallsPositions.value.bottom - BALL_DIAMETER
      );
      ballY.value = y;
      const x = clamp(
        ballStartingPosition.value.x + e.translationX,
        wallsPositions.value.left,
        wallsPositions.value.right - BALL_DIAMETER
      );
      ballX.value = x;
    })
    .onEnd((e) => {
      gestureIsActive.value = false;
      velocityY.value = e.velocityY;
      velocityX.value = e.velocityX;
      ballStartingPosition.value = {
        x: ballX.value,
        y: ballY.value,
      };
      ballY.value = withDecay(
        getDecayOptions(wallsPositions.value, velocityY.value, "y")
      );
      ballX.value = withDecay(
        getDecayOptions(wallsPositions.value, velocityX.value, "x")
      );
    });

  const ballAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ballY.value }, { translateX: ballX.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View ref={ballRef} style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.ball, ballAnimatedStyle]} />
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "blue",
    position: "relative",
  },
  ball: {
    width: BALL_DIAMETER,
    height: BALL_DIAMETER,
    backgroundColor: "red",
    borderRadius: BALL_DIAMETER / 2,
    position: "absolute",
  },
});
