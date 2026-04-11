type ClientLogLevel = "info" | "warn" | "error";

type ClientLogPayload = {
  source: string;
  event: string;
  message?: string;
  detail?: string;
  status?: number;
};

const sendClientLog = (level: ClientLogLevel, payload: ClientLogPayload) => {
  const body = JSON.stringify({
    level,
    path: window.location.pathname,
    ...payload
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/client-log", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch (error) {
    // Fall back to fetch.
  }

  void fetch("/client-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    keepalive: true,
    body
  }).catch(() => {});
};

const installGlobalClientLogging = (source: string) => {
  sendClientLog("info", {
    source,
    event: "page-loaded"
  });

  window.addEventListener("error", (event) => {
    sendClientLog("error", {
      source,
      event: "window-error",
      message: event.message,
      detail: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : ""
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendClientLog("error", {
      source,
      event: "unhandled-rejection",
      message: event.reason instanceof Error ? event.reason.message : String(event.reason || "Unknown rejection")
    });
  });
};

export { installGlobalClientLogging, sendClientLog };
