"use client";
import { useEffect } from "react";

export default function PwaRegistration({
  swUrl,
  scope,
}: {
  swUrl: string;
  scope: string;
}) {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !window.isSecureContext ||
      !("serviceWorker" in navigator)
    )
      return;
    // Await native activation; never force a reload or discard an in-progress form.
    navigator.serviceWorker
      .register(swUrl, {
        scope,
        updateViaCache: "none",
      })
      .then((registration) => registration.update())
      .catch(() => {
        // Installation can fail when offline or storage is full; existing local features remain usable.
      });
  }, [swUrl, scope]);
  return null;
}
