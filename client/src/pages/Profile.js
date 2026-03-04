import { useState, useEffect } from "react";
import axios from "axios";

function Profile() {

  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);
  const [profileImage, setProfileImage] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {

    const fetchUser = async () => {

      const res = await axios.get(
        "http://localhost:5000/api/users/me",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setUsername(res.data.username);
      setProfileImage(res.data.profileImage);
    };

    fetchUser();

  }, []);

  const updateUsername = async () => {

    await axios.put(
      "http://localhost:5000/api/users/username",
      { username },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert("Username updated");
  };

  const uploadImage = async () => {

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
  };

  return (

    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white shadow-lg rounded-xl p-8 w-96 text-center">

        <h2 className="text-2xl font-bold mb-6">Profile</h2>

        {profileImage && (
          <img
            src={profileImage}
            alt="profile"
            className="w-28 h-28 rounded-full mx-auto mb-4 object-cover"
          />
        )}

        <input
          type="text"
          placeholder="New username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border w-full p-2 rounded mb-3"
        />

        <button
          onClick={updateUsername}
          className="bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600"
        >
          Update Username
        </button>

        <br /><br />

        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
          className="mb-3"
        />

        <button
          onClick={uploadImage}
          className="bg-green-500 text-white w-full py-2 rounded hover:bg-green-600"
        >
          Upload Profile Image
        </button>

      </div>

    </div>
  );
}

export default Profile;