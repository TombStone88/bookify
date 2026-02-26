import React from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {

  const navigate = useNavigate();

  const handleLogout = () => {

    localStorage.removeItem("token");

    navigate("/");

  };

  return (

    <nav className="bg-white shadow-sm border-b">

      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* Left Logo */}
        <h1
          onClick={() => navigate("/dashboard")}
          className="text-2xl font-bold text-blue-600 cursor-pointer"
        >
          Bookify
        </h1>

        {/* Right Menu */}
        <div className="flex items-center gap-6">

          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/clubs")}
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            Clubs
          </button>

          <button
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            Profile
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>

        </div>

      </div>

    </nav>

  );

}

export default Navbar;