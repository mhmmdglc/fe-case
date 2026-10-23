import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.scss";

async function enableMocking() {
  // Dev server always uses the mock API; a production build only with VITE_ENABLE_MOCKS=true (npm run demo).
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === "true") {
    const { worker } = await import("./mocks/browser");
    return worker.start({
      onUnhandledRequest: "bypass", // don't warn on Vite HMR requests etc.
    });
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
