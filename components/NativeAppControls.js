"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";

const RELEASES_API = "https://api.github.com/repos/amarbartaula360/amarbartaula.com.np/releases/latest";

function cleanVersion(value = "") {
  return value.replace(/^android-v/i, "").replace(/^v/i, "").trim();
}

function isNewerVersion(latest, current) {
  const a = cleanVersion(latest).split(".").map((n) => Number.parseInt(n, 10) || 0);
  const b = cleanVersion(current).split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left !== right) return left > right;
  }
  return false;
}

export default function NativeAppControls() {
  const [nativeApp, setNativeApp] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    setNativeApp(true);
    let active = true;
    let backListener;

    App.addListener("backButton", ({ canGoBack }) => {
      if (!active) return;
      if (canGoBack) window.history.back();
      else App.exitApp();
    }).then((listener) => {
      backListener = listener;
      if (!active) listener.remove();
    });

    const checkForUpdate = async () => {
      if (!active) return;
      setCheckingUpdate(true);
      try {
        const [appInfo, response] = await Promise.all([
          App.getInfo(),
          fetch(RELEASES_API, {
            headers: { Accept: "application/vnd.github+json" },
            cache: "no-store",
          }),
        ]);
        if (!response.ok) throw new Error("Could not check latest app version");
        const release = await response.json();
        const latestVersion = cleanVersion(release.tag_name || "");
        const apk = (release.assets || []).find((asset) =>
          asset.name?.toLowerCase().endsWith(".apk")
        );

        if (
          active &&
          latestVersion &&
          apk?.browser_download_url &&
          isNewerVersion(latestVersion, appInfo.version)
        ) {
          setUpdateInfo({
            version: latestVersion,
            downloadUrl: apk.browser_download_url,
          });
        }
      } catch {
        // Keep the app usable when the network or release service is unavailable.
      } finally {
        if (active) setCheckingUpdate(false);
      }
    };

    checkForUpdate();

    return () => {
      active = false;
      backListener?.remove();
    };
  }, []);

  const closeApp = async () => {
    if (!nativeApp) return;
    try {
      // Finish the Android Activity immediately; do not block this native action
      // behind a WebView confirm dialog.
      await App.exitApp();
    } catch (error) {
      // If the device/plugin cannot finish the Activity, send the app to background.
      try {
        await App.minimizeApp();
      } catch {
        console.error("Unable to close or minimize the Android app", error);
      }
    }
  };

  const downloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    await Browser.open({ url: updateInfo.downloadUrl });
  };

  if (!nativeApp) return null;

  return (
    <>
      {updateInfo && (
        <section
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: 14,
            right: 14,
            bottom: "max(14px, env(safe-area-inset-bottom))",
            zIndex: 2147483000,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 16,
            color: "#fff",
            background: "#173b2c",
            boxShadow: "0 8px 30px rgba(0,0,0,.28)",
          }}
        >
          <Download size={23} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 750, fontSize: 14 }}>नयाँ Update उपलब्ध छ</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Amar Bartaula v{updateInfo.version}</div>
          </div>
          <button
            type="button"
            onClick={downloadUpdate}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "10px 13px",
              color: "#173b2c",
              background: "#fff",
              fontWeight: 750,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            Update Now
          </button>
          <button
            type="button"
            onClick={() => setUpdateInfo(null)}
            aria-label="Dismiss update notice"
            style={{ border: 0, color: "#fff", background: "transparent", padding: 3 }}
          >
            <X size={18} />
          </button>
        </section>
      )}

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
    </>
  );
}
