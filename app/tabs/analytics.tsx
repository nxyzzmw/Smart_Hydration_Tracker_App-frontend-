import { View, Text } from "react-native";
import Screen from "../../components/Screen";
import Header from "../../components/header";

export default function Analytics() {
  return (
    <Screen>
            <Header />
      
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Analytics Screen</Text>
    </View>
    </Screen>
  );
}
