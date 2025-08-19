// ✅ MonitorLayout.js - rearranged for mobile-first clarity
import React from "react";
import PatchQueue from "./sections/PatchQueue";
import GhostHealthStatus from "./sections/GhostHealthStatus";
import RecentLogs from "./sections/RecentLogs";
import TunnelStatusGrid from "./sections/TunnelStatusGrid";
import SystemOverview from "./sections/SystemOverview";

export default function MonitorLayout() {
  return (
    <div className="monitor-layout mobile-priority">
      <RecentLogs />
      <PatchQueue />
      <GhostHealthStatus />
      <TunnelStatusGrid />
      <SystemOverview />
    </div>
  );
}
