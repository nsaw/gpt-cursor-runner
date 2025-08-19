import React from "react";
import { View } from "react-native";
import { useSlotMode } from "../state/slotMode";
import { injectSlot, hydrateSlot } from "../lib/slotBridge";
import { SlotRouter } from "../lib/slotRouter";

declare const console: any;

const slotTypes = ["DASHBOARD_ENTRY", "TASKS_ENTRY", "AI_TOOLS_ENTRY"];

export const SlotGrid = () => {
  const [slotMode] = useSlotMode();

  const hydratedSlots = slotTypes.map((type) => {
    const injected = injectSlot(type, slotMode);
    const hydrated = hydrateSlot(injected);
    return hydrated;
  });

  return (
    <View style={{ gap: 16 }}>
      {hydratedSlots.map((slot, index) => (
        <React.Fragment key={index}>{SlotRouter(slot)}</React.Fragment>
      ))}
    </View>
  );
};
