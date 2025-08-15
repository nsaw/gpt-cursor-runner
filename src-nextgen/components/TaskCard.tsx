import React from "react";
import { View, Text } from "react-native";
import { useSlotMode } from "../state/slotMode";
declare const console: any;

export const TaskCard = () => {
  const [slotMode] = useSlotMode();
  const isMock = slotMode === "mock";
  console.log(`TaskCard: Rendering (${slotMode} mode)`);
  const tasks = isMock
    ? [
        { id: "t1", title: "Refactor ghost bridge" },
        { id: "t2", title: "Document slot modes" },
      ]
    : [];
  return (
    <View style={{ backgroundColor: "#444", padding: 12, borderRadius: 12 }}>
      <Text style={{ color: "white", fontWeight: "bold" }}>✅ Tasks</Text>
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <Text key={task.id} style={{ color: "white", marginTop: 4 }}>
            • {task.title}
          </Text>
        ))
      ) : (
        <Text style={{ color: "gray", marginTop: 4 }}>
          [TODO: Load real tasks]
        </Text>
      )}
    </View>
  );
};
