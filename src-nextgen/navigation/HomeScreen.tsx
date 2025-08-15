import React from "react";
import { View, Text } from "react-native";
import { SlotGrid } from "../components/SlotGrid";
import DevModeBanner from "../components/DevModeBanner";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, paddingTop: 48, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Dashboard
      </Text>
      <DevModeBanner />
      <SlotGrid />
    </View>
  );
}
