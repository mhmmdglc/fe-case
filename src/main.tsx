import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { mocksEnabled, reconnectMockApi, startMockApi } from "@/app/mockApi";
import { setUnreachableApiHandler } from "@/services/http/httpClient";
import "@/styles/global.scss";

if (mocksEnabled) setUnreachableApiHandler(reconnectMockApi);

startMockApi().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
