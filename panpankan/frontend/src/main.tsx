import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// 不包 StrictMode：旧版嵌入 mpv 时会双跑副作用导致 hang；目前虽已切外部 mpv，
// 但前端 effect 链依旧假设只跑一次，避免 dev 与生产行为偏差。
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <HashRouter>
    <App />
  </HashRouter>
);
