import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { setUnreachableApiHandler } from "./api/client";
import { mocksEnabled, reconnectMockApi, startMockApi } from "./app/mockApi";
import "./styles/global.scss";

if (mocksEnabled) setUnreachableApiHandler(reconnectMockApi);

startMockApi().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
