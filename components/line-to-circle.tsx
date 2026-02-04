import { useEffect } from "react";
import { View, StyleSheet, Dimensions, Button } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEW_BOX = `0 0 ${SCREEN_WIDTH / 3} ${SCREEN_WIDTH / 3}`;

// TARGET PATH DATA -> "M 20,50 A 45,45 0 0 1 110,50 M 20,50 A 45,45 0 0 0 65,95 M 110,50 A 45,45 0 0 1 65,95";

const TARGET_RADIUS = 45;

const Y_START = 20,
  Y_END = Y_START + TARGET_RADIUS;

const X_START = 20,
  X_MIDDLE = X_START + TARGET_RADIUS,
  X_END = X_START + TARGET_RADIUS * 2;

const MAX_RADIUS = 100000;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function LineToCircle() {
  const sharedRadius = useSharedValue(MAX_RADIUS);
  const armAngleX = useSharedValue(0);
  const armAngleY = useSharedValue(0);
  const animatedPathProps = useAnimatedProps(() => {
    const radius = sharedRadius.get();
    const armValueX = armAngleX.get();
    const armValueY = armAngleY.get();

    const leftArmX = interpolate(
      armValueX,
      [0, 100],
      [X_START, X_MIDDLE],
      Extrapolation.CLAMP
    );
    const rightArmX = interpolate(
      armValueX,
      [0, 100],
      [X_END, X_MIDDLE],
      Extrapolation.CLAMP
    );
    const leftArmY = interpolate(
      armValueY,
      [0, 100],
      [Y_START, Y_END],
      Extrapolation.CLAMP
    );

    const rightArmY = interpolate(
      armValueY,
      [0, 100],
      [Y_START, Y_END],
      Extrapolation.CLAMP
    );

    const yOffset = interpolate(
      radius,
      [MAX_RADIUS, TARGET_RADIUS],
      [0, TARGET_RADIUS],
      Extrapolation.CLAMP
    );

    const yPosition = Y_START + yOffset;

    return {
      d: `M ${X_START},${yPosition} 
          A ${radius},${radius} 
          0 0 1 
          ${X_END},${yPosition}
          M ${X_START},${yPosition} 
          A ${radius},${radius} 
          0 0 0 ${leftArmX},${leftArmY + yOffset} 
          M ${X_END},${yPosition} 
          A ${radius},${radius} 
          0 0 1 
          ${rightArmX},${rightArmY + yOffset}`,
    };
  }, []);

  const startAnimation = () => {
    sharedRadius.set(MAX_RADIUS);
    armAngleY.set(0);
    armAngleX.set(0);
    sharedRadius.set(
      withSequence(
        withTiming(TARGET_RADIUS * 7, { duration: 300, easing: Easing.linear }),
        withTiming(
          TARGET_RADIUS + 25,
          { duration: 300, easing: Easing.linear },
          (finished) => {
            if (finished) {
              armAngleY.set(
                withTiming(100, { duration: 600, easing: Easing.linear })
              );
            }
          }
        ),
        withTiming(
          TARGET_RADIUS + 10,
          { duration: 300, easing: Easing.linear },
          (finished) => {
            if (finished) {
              armAngleX.set(
                withTiming(100, { duration: 300, easing: Easing.linear })
              );
            }
          }
        ),
        withTiming(TARGET_RADIUS, { duration: 300, easing: Easing.linear })
      )
    );
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
