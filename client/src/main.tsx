import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import AudioProvider from "./components/AudioProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AudioProvider />
    <App />
  </StrictMode>
);
