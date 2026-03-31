import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Navbar() {
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState(null);
  const [profileImage, setProfileImage] = useState("");

  const token = localStorage.getItem("token");

  const getInitial = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  // CLOSE DROPDOWN
  useEffect(() => {
    const handleClickOutside = () => setShowProfile(false);
    if (showProfile) window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showProfile]);

  // FETCH USER
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/users/me",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUsername(res.data.username);
        setEmail(res.data.email);
        setProfileImage(res.data.profileImage);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const updateUsername = async () => {
    await axios.put(
      "http://localhost:5000/api/users/username",
      { username },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert("Username updated");
  };

  const uploadImage = async () => {
    const formData = new FormData();
    formData.append("image", image);

    const res = await axios.post(
      "http://localhost:5000/api/users/upload-profile",
      formData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setProfileImage(res.data.profileImage);
    alert("Profile image updated");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <div className="flex justify-between items-center mb-10 text-white">
        <h1
          onClick={() => navigate("/dashboard")}
          className="text-2xl font-bold cursor-pointer"
        >
          Bookify
        </h1>

        <div className="flex items-center gap-8 text-lg font-medium">
          <span onClick={() => navigate("/dashboard")} className="cursor-pointer hover:underline">Home</span>
          <span onClick={() => navigate("/clubs")} className="cursor-pointer hover:underline">MyClub</span>

          {/* AVATAR */}
          <div className="relative">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowProfile(!showProfile);
              }}
              className="w-10 h-10 rounded-full overflow-hidden bg-white text-black flex items-center justify-center font-bold cursor-pointer"
            >
              {profileImage ? (
                <img src={profileImage} className="w-full h-full object-cover" />
              ) : (
                getInitial(username)
              )}
            </div>

            {/* DROPDOWN */}
            {showProfile && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-lg p-4 z-50 text-black"
              >
                <div className="text-center mb-3">
                  <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-2">
                    {profileImage ? (
                      <img src={profileImage} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        {getInitial(username)}
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold">{username}</h3>
                  <p className="text-sm text-gray-500">{email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowProfile(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                >
                  Profile Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-red-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div onClick={() => setShowProfileModal(false)} className="absolute inset-0" />

          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-8 w-96 z-50">
            <h2 className="text-xl font-bold mb-4 text-center">Your Profile</h2>

            <div className="w-24 h-24 mx-auto mb-4">
              {profileImage ? (
                <img src={profileImage} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
                  {getInitial(username)}
                </div>
              )}
            </div>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border p-2 rounded mb-3"
            />

            <button onClick={updateUsername} className="bg-blue-600 text-white w-full py-2 rounded mb-3">
              Update Username
            </button>

            <input type="file" onChange={(e) => setImage(e.target.files[0])} className="mb-3" />

            <button onClick={uploadImage} className="bg-green-600 text-white w-full py-2 rounded">
              Upload Image
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;