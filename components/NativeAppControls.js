"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { X } from "lucide-react";

export default function NativeAppControls() {
  const [nativeApp, setNativeApp] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    setNativeApp(true);
    let active = true;
    let backListener;

    App.addListener("backButton", ({ canGoBack }) => {
      if (!active) return;
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    }).then((listener) => {
      backListener = listener;
      if (!active) listener.remove();
    });

    return () => {
      active = false;
      backListener?.remove();
    };
  }, []);

  const closeApp = async () => {
    if (!nativeApp) return;
    const confirmed = window.confirm("के तपाईं Amar Bartaula App बन्द गर्न चाहनुहुन्छ?");
    if (confirmed) await App.exitApp();
  };

  if (!nativeApp) return null;

  return (
    <button
      type="button"
      onClick={closeApp}
      aria-label="Close Amar Bartaula app"
      title="Close app"
      style={{
        position: "fixed",
        top: "max(12px, env(safe-area-inset-top))",
        right: "max(12px, env(safe-area-inset-right))",
        zIndex: 2147483000,
        width: 40,
        height: 40,
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(255,255,255,.28)",
        borderRadius: 999,
        color: "#fff",
        background: "rgba(23,35,30,.92)",
        boxShadow: "0 4px 18px rgba(0,0,0,.2)",
        cursor: "pointer",
      }}
    >
      <X size={19} />
    </button>
  );
}
