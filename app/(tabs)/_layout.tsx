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
      <Tabs.Screen
        name="line-to-circle"
        options={{
          title: "Line to Circle",
        }}
      />
      <Tabs.Screen
        name="bouncing-ball"
        options={{
          title: "Bouncing Ball",
        }}
      />
      <Tabs.Screen
        name="cards-swiping"
        options={{
          title: "Swiping Cards",
        }}
      />
    </Tabs>
  );
}
