import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Solar System Top Down",
        }}
      />
      <Tabs.Screen
        name="solar-system-side-perspective"
        options={{
          title: "Solar System Side Perspective",
        }}
      />
    </Tabs>
  );
}
