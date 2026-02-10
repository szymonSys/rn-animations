import GenericView from "@/components/ui/generic-view";
import CardsSwiping from "@/components/cards-swiping";
import { Dimensions, Text, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DATA = Array.from({ length: 6 }, (_, index) => ({
  id: index,
  title: `Card ${index + 1}`,
  description: `Description of card ${index + 1}`,
  image: `https://picsum.photos/seed/${
    index + 1
  }/${SCREEN_WIDTH}/${SCREEN_HEIGHT}`,
}));

function renderCard(item: (typeof DATA)[number], absoluteIndex: number) {
  return (
    <View key={item.id}>
      <Text>{item.title}</Text>
      <Text>{item.description}</Text>
    </View>
  );
}

function extractKey(item: (typeof DATA)[number]) {
  return item.id;
}

export default function CardsSwipingView() {
  return (
    <GenericView>
      <CardsSwiping
        data={DATA}
        renderCard={renderCard}
        extractKey={extractKey}
      />
    </GenericView>
  );
}
