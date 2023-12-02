import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { PartySocketProvider } from "./hooks/usePartyRPC.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PartySocketProvider idRoom="some-room">
      <App />
    </PartySocketProvider>
  </React.StrictMode>,
);
