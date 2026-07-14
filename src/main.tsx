import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { UploadZipPage } from "./pages/UploadZipPage";
import { ZipDownloadPage } from "./pages/ZipDownloadPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/upload-zip" element={<UploadZipPage />} />
        <Route path="/zip/:id" element={<ZipDownloadPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
