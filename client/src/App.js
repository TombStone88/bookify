import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clubs from "./pages/Clubs";
import JoinClub from "./pages/JoinClub";
import ClubDashboard from "./pages/ClubDashboard";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Auth />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/clubs" element={<Clubs />} />

        <Route path="/join/:inviteCode" element={<JoinClub />} />

        <Route path="/club/:clubId" element={<ClubDashboard />} />

      </Routes>

    </BrowserRouter>

  );

}

export default App;