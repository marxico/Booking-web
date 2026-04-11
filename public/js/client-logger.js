const postClientLog = (level, payload) => {
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
    // Ignore and fall back to fetch.
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

export const logClientInfo = (event, message = "", detail = "") => {
  postClientLog("info", {
    source: "public-js",
    event,
    message,
    detail
  });
};

export const logClientError = (event, message = "", detail = "") => {
  postClientLog("error", {
    source: "public-js",
    event,
    message,
    detail
  });
};

export const installClientLogging = (source = "public-js") => {
  postClientLog("info", {
    source,
    event: "page-loaded"
  });

  window.addEventListener("error", (event) => {
    postClientLog("error", {
      source,
      event: "window-error",
      message: event.message,
      detail: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : ""
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    postClientLog("error", {
      source,
      event: "unhandled-rejection",
      message: event.reason instanceof Error ? event.reason.message : String(event.reason || "Unknown rejection")
    });
  });
};
