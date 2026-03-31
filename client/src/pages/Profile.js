import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function Profile() {
  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);
  const [profileImage, setProfileImage] = useState("");

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/users/me",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        setUsername(res.data.username);
        setProfileImage(res.data.profileImage);

      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, []);

  const updateUsername = async () => {
    try {
      await axios.put(
        "http://localhost:5000/api/users/username",
        { username },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert("Username updated");

    } catch (err) {
      console.error(err);
    }
  };

  const uploadImage = async () => {
    try {
      const formData = new FormData();
      formData.append("image", image);

      const res = await axios.post(
        "http://localhost:5000/api/users/upload-profile",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProfileImage(res.data.profileImage);
      alert("Profile image updated");

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center items-center p-6">

      {/* MAIN CARD */}
      <div className="w-[95%] max-w-[1200px] bg-gradient-to-br from-pink-500 via-red-500 to-pink-600 rounded-3xl p-10 shadow-xl relative">

        {/* 🔥 BACK BUTTON (FIXED YOUR ISSUE) */}
        <button
          onClick={() => navigate("/dashboard")}
          className="absolute top-6 left-6 bg-white text-black px-4 py-2 rounded-lg shadow hover:scale-105 transition"
        >
          ← Back
        </button>

        {/* PROFILE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mx-auto text-center"
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Your Profile
          </h2>

          {/* IMAGE */}
          <div className="relative w-28 h-28 mx-auto mb-5">
            {profileImage ? (
              <img
                src={profileImage}
                alt="profile"
                className="w-28 h-28 rounded-full object-cover border-4 border-pink-500 shadow"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-300 flex items-center justify-center text-2xl">
                👤
              </div>
            )}
          </div>

          {/* USERNAME */}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded mb-3 focus:outline-none focus:border-pink-500"
          />

          <button
            onClick={updateUsername}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded mb-5 transition"
          >
            Update Username
          </button>

          {/* IMAGE UPLOAD */}
          <input
            type="file"
            onChange={(e) => setImage(e.target.files[0])}
            className="mb-3 text-sm"
          />

          <button
            onClick={uploadImage}
            className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded transition"
          >
            Upload Profile Image
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default Profile;