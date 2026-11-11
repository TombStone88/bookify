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
              background: "#161b29",
              color: "#dde2f5",
              border: "1px solid rgba(242, 190, 140, 0.25)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              fontFamily: "Manrope, sans-serif",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#f2be8c", secondary: "#0d1320" } },
            error:   { iconTheme: { primary: "#ffb4ab", secondary: "#0d1320" } },
          }}
        />

        <Routes>
          {/* ── Public routes ── */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile/:username" element={<Profile />} />

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
