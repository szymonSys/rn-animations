import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function GenericView({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
