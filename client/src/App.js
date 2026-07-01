import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Clubs from "./pages/Clubs";
import JoinClub from "./pages/JoinClub";
import ClubDashboard from "./pages/ClubDashboard";
import PDFViewer from "./pages/PDFViewer";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#1f2230",
              border: "1px solid #ececf3",
              boxShadow: "0 8px 24px rgba(20,20,40,0.12)",
            },
            success: { iconTheme: { primary: "#22c55e", secondary: "#ffffff" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
          }}
        />

        <Routes>
          {/* ── Public routes ── */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />

          {/* ── Protected routes ── */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/clubs" element={
            <ProtectedRoute><Clubs /></ProtectedRoute>
          } />
          <Route path="/join/:inviteCode" element={
            <JoinClub />
          } />
          <Route path="/club/:clubId" element={
            <ProtectedRoute><ClubDashboard /></ProtectedRoute>
          } />
          <Route path="/viewer" element={
            <ProtectedRoute><PDFViewer /></ProtectedRoute>
          } />

          {/* ── Fallback ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
