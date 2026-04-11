import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installGlobalClientLogging } from "./services/clientLogger";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

installGlobalClientLogging("frontend-react");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
