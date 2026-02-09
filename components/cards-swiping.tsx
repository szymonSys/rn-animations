import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  Extrapolation,
  clamp,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { scheduleOnRN } from "react-native-worklets";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CART_WIDTH = SCREEN_WIDTH * 0.85;
const GAP_WIDTH = (SCREEN_WIDTH - CART_WIDTH) / 2;

const CARD_OFFSET = CART_WIDTH + GAP_WIDTH;

const DATA = Array.from({ length: 1000 }, (_, index) => ({
  id: index,
  title: `Card ${index + 1}`,
  description: `Description of card ${index + 1}`,
  image: `https://picsum.photos/seed/${
    index + 1
  }/${SCREEN_WIDTH}/${SCREEN_HEIGHT}`,
}));

type ScrollContext = {};

function calculateIndex(
  offset: number,
  min: number = 0,
  max: number = DATA.length - 1
) {
  "worklet";
  return clamp(Math.round(offset / CARD_OFFSET), min, max);
}

function calculateProgress(offset: number) {
  "worklet";
  const currentProgress = offset / CARD_OFFSET;
  return currentProgress - Math.floor(currentProgress);
}

export default function CardsSwiping() {
  const startScrollOffset = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const currentImageIndex = useSharedValue(0);
  const transitionProgress = useSharedValue(0);
  const [indexState, setIndexState] = useState(0);

  useAnimatedReaction(
    () => currentImageIndex.value,
    (value, prevValue) => {
      if (prevValue === null) {
        return;
      }
      scheduleOnRN(setIndexState, value);
    }
  );

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      const index = calculateIndex(scrollOffset.value);
      startScrollOffset.value = index * CARD_OFFSET;
      currentImageIndex.value = index;
    })
    .onUpdate((e) => {
      scrollOffset.value = Math.ceil(startScrollOffset.value - e.translationX);
    })
    .onFinalize((e) => {
      const difference = scrollOffset.value - startScrollOffset.value;
      const direction = Math.sign(difference);
      const newOffset = startScrollOffset.value + CARD_OFFSET * direction;
      const shouldSnap = Math.abs(difference) > CART_WIDTH / 2;
      if (shouldSnap) {
        scrollOffset.value = clamp(
          newOffset,
          0,
          CARD_OFFSET * (DATA.length - 1)
        );
        return;
      }
      scrollOffset.value = startScrollOffset.value;
    });

  const scrollHandler = useAnimatedScrollHandler<ScrollContext>((event) => {
    const index = calculateIndex(event.contentOffset.x);
    if (index !== currentImageIndex.value) {
      currentImageIndex.value = index;
    }
    transitionProgress.value = calculateProgress(event.contentOffset.x);
  }, []);

  const scrollViewProps = useAnimatedProps(() => ({
    contentOffset: {
      x: withSpring(scrollOffset.value),
      y: 0,
    },
  }));

  const cards = useMemo(() => {
    const start = Math.max(indexState - 1, 0);
    const end = Math.min(start + 3, DATA.length - 1);
    return DATA.slice(start, end).map((item, sliceIndex) => {
      const absoluteIndex = start + sliceIndex;
      const transformX = absoluteIndex * CARD_OFFSET;
      return (
        <Animated.View
          style={[styles.card, { transform: [{ translateX: transformX }] }]}
          key={item.title}
        >
          <Text>{item.title}</Text>
          <Text>{item.description}</Text>
        </Animated.View>
      );
    });
  }, [indexState]);

  const imageProps = useAnimatedProps(() => {
    const blurRadius = interpolate(
      transitionProgress.value,
      [0, 0.5, 1],
      [0, 30, 0],
      Extrapolation.CLAMP
    );
    return {
      source: { uri: DATA[currentImageIndex.value].image },
      blurRadius: withSpring(Math.floor(blurRadius)),
    };
  });

  const imageMaskStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(
        interpolate(
          transitionProgress.value,
          [0, 0.5, 1],
          [0, 1, 0],
          Extrapolation.CLAMP
        )
      ),
    };
  });

  return (
    <View style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <Animated.ScrollView
          ref={scrollViewRef}
          scrollEnabled={false}
          animatedProps={scrollViewProps}
          onScroll={scrollHandler}
          horizontal
          removeClippedSubviews={true}
          style={styles.container}
          showsHorizontalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.wrapper, { width: CARD_OFFSET * DATA.length }]}
          >
            {cards}
          </Animated.View>
        </Animated.ScrollView>
      </GestureDetector>
      <Animated.View style={styles.imageContainer}>
        <Animated.View style={[styles.imageMask, imageMaskStyle]} />
        <AnimatedImage
          animatedProps={imageProps}
          style={styles.cardImage}
          cachePolicy="memory-disk"
          priority="high"
          transition={{ duration: 100 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  container: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  imageContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
  wrapper: {
    flex: 1,
    padding: GAP_WIDTH,
    flexDirection: "row",
    gap: GAP_WIDTH,
  },
  imageMask: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    backgroundColor: "black",
    zIndex: 2,
  },
  card: {
    width: CART_WIDTH,
    height: "60%",
    backgroundColor: "#ffffff",
    borderRadius: 32,
    padding: 16,
    bottom: GAP_WIDTH,
    left: GAP_WIDTH,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1,
    position: "absolute",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
});
