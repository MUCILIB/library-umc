import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { API_BASE_URL } from "@/utils/api-config";

function getSessionId(): string {
  const key = "umc_web_session_id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.sessionStorage.setItem(key, generated);
  return generated;
}

export default function WebTrafficTracker() {
  const location = useLocation();
  const lastTrackedRef = useRef<string>("");

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;

    if (lastTrackedRef.current === path) {
      return;
    }

    lastTrackedRef.current = path;

    const payload = {
      path,
      sessionId: getSessionId()
    };

    const url = `${API_BASE_URL}/api/reports/web-traffic/ping`;
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
      keepalive: true
    }).catch(() => {
      // Tracking failures should not impact app behavior.
    });
  }, [location.pathname, location.search]);

  return null;
}
