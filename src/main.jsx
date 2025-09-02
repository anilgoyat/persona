import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ChatPage from "./pages/ChatPage";
import "./index.css";
import { PersonaProvider } from "./context/PersonaContext";
import ToolPage from "./pages/ToolPage";
import RegexExplainer from "./pages/RegexExplainer";
import CSSPlayground from "./pages/CSSPlayground";
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <PersonaProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/tools" element={<ToolPage />} />
        <Route path="/tools/regex" element={<RegexExplainer />} />
        <Route path="/tools/css" element={<CSSPlayground />} />
      </Routes>
    </PersonaProvider>
  </BrowserRouter>
);
