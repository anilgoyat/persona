import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ChatPage from "./pages/ChatPage";
import "./index.css";
import { PersonaProvider } from "./context/PersonaContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <PersonaProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/chat/:id" element={<ChatPage />} />
      </Routes>
    </PersonaProvider>
  </BrowserRouter>
);
