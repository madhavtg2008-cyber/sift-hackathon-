"use client";

import { useSyncExternalStore } from "react";
import { netguard, serverSnapshot } from "@/lib/netguard";

/** Live view of the privacy firewall's network log. */
export function useNetEvents() {
  return useSyncExternalStore(netguard.subscribe, netguard.snapshot, serverSnapshot);
}
