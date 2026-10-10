"use client";

import { useEffect, useState } from "react";
import { getQueuedEntries, removeQueuedEntry, queuedCount } from "@/lib/offlineQueue";

export default function OfflineSync() {
  const [status, setStatus] = useState<"idle" | "syncing" | "synced" | "offline">("idle");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setPending(queuedCount());

    async function flush() {
      const queue = getQueuedEntries();
      if (queue.length === 0) return;
      setStatus("syncing");
      for (const entry of queue) {
        try {
          const res = await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: entry.content }),
          });
          if (res.ok) removeQueuedEntry(entry.id);
        } catch {
          // Still offline (or server unreachable) - leave it queued, try
          // again on the next online event.
          break;
        }
      }
      const remaining = queuedCount();
      setPending(remaining);
      setStatus(remaining === 0 ? "synced" : "offline");
      if (remaining === 0) setTimeout(() => setStatus("idle"), 3000);
    }

    function handleOnline() {
      flush();
    }
    function handleOffline() {
      setStatus("offline");
    }

    if (navigator.onLine) flush();
    else if (queuedCount() > 0) setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (status === "idle" || pending === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-brand-600 px-4 py-1.5 text-center text-xs font-medium text-white">
      {status === "syncing" && `Syncing ${pending} offline ${pending === 1 ? "entry" : "entries"}…`}
      {status === "offline" && `You're offline - ${pending} ${pending === 1 ? "entry" : "entries"} saved locally, will sync when back online.`}
      {status === "synced" && "All offline entries synced ✓"}
    </div>
  );
}
