import { useState } from "react";

declare const console: any;

export type SlotMode = "mock" | "live";

export function useSlotMode(): [SlotMode, () => void] {
  const [mode, setMode] = useState<SlotMode>("mock");

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "mock" ? "live" : "mock";
      console.log(`[SlotBridge] Switched to: ${next}`);
      return next;
    });
  };

  return [mode, toggleMode];
}
