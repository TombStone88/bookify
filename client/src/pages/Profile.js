import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";

function Profile() {

  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);
  const [profileImage, setProfileImage] = useState("");

  const token = localStorage.getItem("token");

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

    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-900 flex items-center justify-center text-white">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gray-900 shadow-xl rounded-xl p-8 w-96 text-center"
      >

        <h2 className="text-2xl font-bold mb-6">
          Your Profile
        </h2>

        {/* Profile Image */}

        <div className="relative w-28 h-28 mx-auto mb-5">

          {profileImage ? (
            <img
              src={profileImage}
              alt="profile"
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
              👤
            </div>
          )}

        </div>

        {/* Username */}

        <input
          type="text"
          placeholder="New username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 p-2 rounded mb-3 focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={updateUsername}
          className="bg-blue-600 hover:bg-blue-700 transition w-full py-2 rounded mb-5"
        >
          Update Username
        </button>

        {/* Upload Image */}

        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
          className="mb-3 text-sm"
        />

        <button
          onClick={uploadImage}
          className="bg-green-600 hover:bg-green-700 transition w-full py-2 rounded"
        >
          Upload Profile Image
        </button>

      </motion.div>

    </div>
  );
}

export default Profile;