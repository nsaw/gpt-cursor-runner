import React, { useEffect } from "react";
import { View, Text } from "react-native";

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

export default function DevModeBanner() {
  useEffect(() => console.log("Dev Mode"), []);
  return (
    <View
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        backgroundColor: "rgba(255,255,255,0.6)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: "#111", fontSize: 12 }}>Dev Mode</Text>
    </View>
  );
}
