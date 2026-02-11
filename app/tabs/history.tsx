import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import Header from "../../components/header";

export default function History() {
  return (
    <Screen>
      <Header title="History" />

      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0E1E40",
  },
});
