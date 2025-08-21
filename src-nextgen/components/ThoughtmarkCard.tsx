import React from "react";
import { View, Text } from "react-native";
import { useSlotMode } from "../state/slotMode";
declare const console: unknown;

export const ThoughtmarkCard = () => {
  const [slotMode] = useSlotMode();
  const isMock = slotMode === "mock";
  console.log(`ThoughtmarkCard: Rendering (${slotMode} mode)`);
  const thoughtmarks = isMock
    ? [
        { id: "tm1", title: "📌 Quantum Theory" },
        { id: "tm2", title: "🧠 Neuro Slot Maps" },
      ]
    : [];
  return (
    <View style={{ backgroundColor: "#222", padding: 12, borderRadius: 12 }}>
      <Text style={{ color: "white", fontWeight: "bold" }}>
        🧠 Thoughtmarks
      </Text>
      {thoughtmarks.length > 0 ? (
        thoughtmarks.map((tm) => (
          <Text key={tm.id} style={{ color: "white", marginTop: 4 }}>
            {tm.title}
          </Text>
        ))
      ) : (
        <Text style={{ color: "gray", marginTop: 4 }}>
          [TODO: Load real thoughtmarks]
        </Text>
      )}
    </View>
  );
};
