import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
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
import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import { scheduleOnRN } from "react-native-worklets";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CART_WIDTH = SCREEN_WIDTH * 0.85;
const GAP_WIDTH = (SCREEN_WIDTH - CART_WIDTH) / 2;
const CARD_OFFSET = CART_WIDTH + GAP_WIDTH;

const AnimatedImage = Animated.createAnimatedComponent(Image);

export type CardSwipingProps<T extends { image: string }> = {
  data: T[];
  renderCard: (item: T, absoluteIndex: number) => React.ReactNode;
  extractKey: (item: T) => number | string;
  batchSize?: number;
};

type ContextType = {
  getCurrentIndex: () => number;
  scrollToIndex: (index: number) => void;
  data: any[];
  extractKey: (item: any) => number | string;
};

const CardsSwipingContext = createContext<ContextType>({
  getCurrentIndex: () => 0,
  scrollToIndex: () => {},
  data: [],
  extractKey: () => "",
});

function CardsSwipingProvider({
  children,
  ...props
}: PropsWithChildren<ContextType>) {
  return (
    <CardsSwipingContext.Provider value={props}>
      {children}
    </CardsSwipingContext.Provider>
  );
}

export default function CardsSwiping<Item extends { image: string }>({
  data,
  renderCard,
  extractKey,
  batchSize = 3,
}: CardSwipingProps<Item>) {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const startScrollOffset = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const transitionProgress = useSharedValue(0);
  const imageSourceMutex = useSharedValue(false);

  const [indexState, setIndexState] = useState(0);
  const [imageSource, setImageSource] = useState(data[indexState].image);

  useAnimatedReaction(
    () => currentIndex.value,
    (value, prevValue) => {
      if (prevValue === null) {
        return;
      }
      scheduleOnRN(setIndexState, value);
      if (!imageSourceMutex.value) {
        scheduleOnRN(setImageSource, data[value].image);
      }
    }
  );

  function calculateIndex(
    offset: number,
    min: number = 0,
    max: number = data.length - 1
  ) {
    "worklet";
    return clamp(Math.round(offset / CARD_OFFSET), min, max);
  }

  function calculateTransition(offset: number) {
    "worklet";
    const currentProgress = offset / CARD_OFFSET;
    return currentProgress - Math.floor(currentProgress);
  }

  function calculateScrollAnimationProgress(offset: number): number {
    "worklet";
    return withSpring(
      clamp(offset, 0, CARD_OFFSET * (data.length - 1)),
      undefined,
      (finished) => {
        if (finished) {
          transitionProgress.value = 0;
          imageSourceMutex.value = false;
        }
      }
    );
  }

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      const index = calculateIndex(scrollOffset.value);
      startScrollOffset.value = index * CARD_OFFSET;
      currentIndex.value = index;
    })
    .onUpdate((e) => {
      scrollOffset.value = Math.ceil(startScrollOffset.value - e.translationX);
    })
    .onFinalize((e) => {
      const difference = scrollOffset.value - startScrollOffset.value;
      const index = calculateIndex(scrollOffset.value);
      const newOffset = index * CARD_OFFSET;
      const shouldSnap = Math.abs(difference) > CART_WIDTH / 2;
      if (shouldSnap) {
        scrollOffset.value = calculateScrollAnimationProgress(newOffset);
        startScrollOffset.value = scrollOffset.value;
        return;
      }
      scrollOffset.value = calculateScrollAnimationProgress(
        startScrollOffset.value
      );
    });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const index = calculateIndex(event.contentOffset.x);
    if (index !== currentIndex.value) {
      currentIndex.value = index;
    }
    if (!imageSourceMutex.value) {
      transitionProgress.value = calculateTransition(event.contentOffset.x);
    }
  }, []);

  const scrollViewProps = useAnimatedProps(() => ({
    contentOffset: {
      x: scrollOffset.value,
      y: 0,
    },
  }));

  const cards = useMemo(() => {
    const start = Math.max(indexState - 1, 0);
    const end = Math.min(start + batchSize, data.length);
    return data.slice(start, end).map((item, sliceIndex) => {
      const absoluteIndex = start + sliceIndex;
      const transformX = absoluteIndex * CARD_OFFSET;
      return (
        <Animated.View
          style={[styles.card, { transform: [{ translateX: transformX }] }]}
          key={extractKey(item)}
        >
          {renderCard(item, absoluteIndex)}
        </Animated.View>
      );
    });
  }, [indexState, data, extractKey, renderCard, batchSize]);

  const imageProps = useAnimatedProps(() => {
    const blurRadius = interpolate(
      transitionProgress.value,
      [0, 0.5, 1],
      [0, 30, 0],
      Extrapolation.CLAMP
    );
    return {
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

  const getCurrentIndex = () => indexState;

  function scrollToIndex(index: number) {
    imageSourceMutex.value = true;
    index = clamp(index, 0, data.length - 1);
    const newOffset = index * CARD_OFFSET;
    scrollOffset.value = calculateScrollAnimationProgress(newOffset);
    transitionProgress.value = withSpring(0.5, undefined, (finished) => {
      scheduleOnRN(setImageSource, data[index].image);
    });
  }

  return (
    <View style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <Animated.ScrollView
          ref={scrollViewRef}
          scrollEnabled={false}
          animatedProps={scrollViewProps}
          onScroll={scrollHandler}
          horizontal
          style={styles.container}
          showsHorizontalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.wrapper, { width: CARD_OFFSET * data.length }]}
          >
            {cards}
          </Animated.View>
        </Animated.ScrollView>
      </GestureDetector>
      <CardsSwipingProvider
        data={data}
        extractKey={extractKey}
        getCurrentIndex={getCurrentIndex}
        scrollToIndex={scrollToIndex}
      >
        <IndicatorsWrapper data={data} />
      </CardsSwipingProvider>
      <Animated.View style={styles.imageContainer}>
        <Animated.View style={[styles.imageMask, imageMaskStyle]} />
        <AnimatedImage
          animatedProps={imageProps}
          style={styles.cardImage}
          cachePolicy="memory-disk"
          priority="high"
          source={{ uri: imageSource }}
          transition={{ duration: 100 }}
        />
      </Animated.View>
    </View>
  );
}

export function IndicatorsWrapper({ data }: { data: { image: string }[] }) {
  const context = useContext(CardsSwipingContext);
  if (!context) {
    throw new Error(
      "IndicatorsWrapper must be used within a CardsSwipingProvider"
    );
  }
  return (
    <View style={styles.indicatorsContainer}>
      {data.map((item, index) => (
        <Indicator key={context.extractKey(item)} index={index} />
      ))}
    </View>
  );
}

export function Indicator({ index }: { index: number }) {
  const context = useContext(CardsSwipingContext);
  if (!context) {
    throw new Error("Indicator must be used within a CardsSwipingProvider");
  }
  const isCurrent = index === context.getCurrentIndex();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isCurrent ? 1 : 0.5),
  }));
  return (
    <TouchableWithoutFeedback onPress={() => context.scrollToIndex(index)}>
      <Animated.View style={[styles.indicator, animatedStyle]} />
    </TouchableWithoutFeedback>
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
    top: GAP_WIDTH * 2,
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
  indicator: {
    flex: 1,
    height: 6,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
  indicatorsContainer: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    alignItems: "stretch",
    justifyContent: "center",
    top: GAP_WIDTH,
    left: GAP_WIDTH,
    right: GAP_WIDTH,
    zIndex: 3,
  },
});
