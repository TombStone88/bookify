import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clubs from "./pages/Clubs";
import JoinClub from "./pages/JoinClub";
import ClubDashboard from "./pages/ClubDashboard";
import PDFViewer from "./pages/PDFViewer";
import { Toaster } from "react-hot-toast";


function App() {

  return (

    <BrowserRouter>

              <Toaster position="top-right" />


      <Routes>
        

        <Route path="/" element={<Auth />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/clubs" element={<Clubs/>} />

        <Route path="/join/:inviteCode" element={<JoinClub />} />

        <Route path="/club/:clubId" element={<ClubDashboard />} />

        <Route path="/viewer" element={<PDFViewer />} />

      </Routes>

    </BrowserRouter>

  );

}

export default App;