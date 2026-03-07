import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Navbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);
  const [profileImage, setProfileImage] = useState("");

  const dropdownRef = useRef(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data);
        setUsername(res.data.username);
        setProfileImage(res.data.profileImage);
      } catch (err) {
        console.log(err);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setShowEdit(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const updateUsername = async () => {
    await axios.put(
      "http://localhost:5000/api/users/username",
      { username },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    setUser({ ...user, username });
    alert("Username updated");
  };

  const uploadImage = async () => {
    const formData = new FormData();
    formData.append("image", image);

    const res = await axios.post(
      "http://localhost:5000/api/users/upload-profile",
      formData,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    setProfileImage(res.data.profileImage);
    setUser({ ...user, profileImage: res.data.profileImage });

    alert("Profile image updated");
  };

  return (
    <nav className="bg-gray-950/80 backdrop-blur border-b border-gray-800 sticky top-0 z-50">
      {" "}
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1
          onClick={() => navigate("/dashboard")}
          className="text-2xl font-bold text-blue-600 cursor-pointer"
        >
          Bookify
        </h1>

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-300 hover:text-blue-400 font-medium"
          >
            Dashboard{" "}
          </button>

          <button
            onClick={() => navigate("/clubs")}
            className="text-gray-300 hover:text-blue-600 font-medium"
          >
            Clubs{" "}
          </button>

          <div className="relative" ref={dropdownRef}>
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 hover:scale-110 transition"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  👤
                </div>
              )}

              <span className="font-medium">{user?.username}</span>
            </div>

            {open && (
              <div className="absolute right-0 mt-3 w-64 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800 p-5 animate-fadeIn">
                <div className="flex flex-col items-center">
                  <img
                    src={
                      user?.profileImage ||
                      `https://ui-avatars.com/api/?name=${user?.username}&background=0D8ABC&color=fff`
                    }
                    className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 mb-3"
                  />

                  <p className="font-semibold text-lg">{user?.username}</p>

                  <p className="text-sm text-gray-400">
                    Member since{" "}
                    {new Date(user?.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="border-t border-gray-700 my-3"></div>

                <div className="text-sm space-y-1 text-gray-300">
                  <p>📚 Books uploaded: {user?.booksUploaded || 0}</p>
                  <p>👥 Clubs joined: {user?.clubsJoined || 0}</p>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => setShowEdit(true)}
                    className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                  >
                    ✏ Edit Profile
                  </button>

                  <button
                    onClick={handleLogout}
                    className="py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showEdit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 animate-fadeIn">
          <div className="bg-white w-96 rounded-xl shadow-lg p-6 relative animate-scaleIn">
            <button
              onClick={() => setShowEdit(false)}
              className="absolute top-3 right-3"
            >
              ✕{" "}
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center">
              Edit Profile
            </h2>

            <div className="flex flex-col items-center">
              <img
                src={profileImage}
                className="w-24 h-24 rounded-full mb-4 object-cover"
              />

              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                className="mb-3"
              />

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border rounded-lg p-2 w-full mb-3"
                placeholder="Username"
              />

              <button
                onClick={updateUsername}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full mb-2"
              >
                Update Username{" "}
              </button>

              <button
                onClick={uploadImage}
                className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
              >
                Upload Image{" "}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
