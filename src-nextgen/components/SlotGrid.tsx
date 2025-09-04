import React from "react";
import { View } from "react-native";
import { useSlotMode } from "../state/slotMode";
import { injectSlot, hydrateSlot } from "../lib/slotBridge";
import { SlotRouter } from "../lib/slotRouter";

const slotTypes = ["DASHBOARD_ENTRY", "TASKS_ENTRY", "AI_TOOLS_ENTRY"];

export const SlotGrid = () => {
  const [slotMode] = useSlotMode();

  const slots = slotTypes.reduce((acc, type) => {
    injectSlot(type, slotMode);
    const hydrated = hydrateSlot(type);
    acc[type] = hydrated;
    return acc;
  }, {} as Record<string, React.ReactNode>);

  return (
    <View style={{ gap: 16 }}>
      <SlotRouter>
        {Object.entries(slots).map(([key, value]) => (
          <View key={key}>{value}</View>
        ))}
      </SlotRouter>
    </View>
  );
};
