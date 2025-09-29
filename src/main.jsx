import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "antd/dist/reset.css";   // ✅ Correct for AntD v5
import "./styles.css";

createRoot(document.getElementById("root")).render(<App />);
