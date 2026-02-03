import { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
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

// const TARGET_PATH_DATA =
//   "M 20,50 A 45,45 0 0 1 110,50 M 20,50 A 45,45 0 0 0 65,95 M 110,50 A 45,45 0 0 1 65,95";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function LineToCircle() {
  const sharedRadius = useSharedValue(0);
  const armAngleX = useSharedValue(0);
  const armAngleY = useSharedValue(0);
  const animatedPathProps = useAnimatedProps(() => {
    const radius = sharedRadius.get();
    const armValueX = armAngleX.get();
    const armValueY = armAngleY.get();
    const leftArmX = interpolate(
      armValueX,
      [0, 100],
      [20, 65],
      Extrapolation.CLAMP
    );
    const leftArmY = interpolate(
      armValueY,
      [0, 100],
      [50, 95],
      Extrapolation.CLAMP
    );
    const rightArmX = interpolate(
      armValueX,
      [0, 100],
      [110, 65],
      Extrapolation.CLAMP
    );
    const rightArmY = interpolate(
      armValueY,
      [0, 100],
      [50, 95],
      Extrapolation.CLAMP
    );
    return {
      d: `M 20,50 A ${radius},${radius} 0 0 1 110,50 M 20,50 A ${radius},${radius} 0 0 0 ${leftArmX},${leftArmY} M 110,50 A ${radius},${radius} 0 0 1 ${rightArmX},${rightArmY}`,
    };
  }, []);

  useEffect(() => {
    sharedRadius.set(100000);
    sharedRadius.set(
      withSequence(
        withTiming(300, { duration: 100 }),
        withTiming(70, { duration: 500 }, (finished) => {
          if (finished) {
            armAngleY.set(withTiming(100, { duration: 1000 }));
          }
        }),
        withTiming(55, { duration: 500 }, (finished) => {
          if (finished) {
            armAngleX.set(withTiming(100, { duration: 1000 }));
          }
        }),
        withTiming(45, { duration: 1000 })
      )
    );
  }, []);

  return (
    <View style={styles.container}>
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_WIDTH}
        viewBox={VIEW_BOX}
        style={styles.svg}
      >
        <AnimatedPath
          animatedProps={animatedPathProps}
          stroke="red"
          strokeWidth={1}
        />
      </Svg>
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
