import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";

function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("http://localhost:5000/api/clubs/my-clubs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setClubs(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/api/clubs/create", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setShowModal(false);

      setForm({
        name: "",
        description: "",
      });

      fetchClubs();
    } catch (error) {
      console.error(error);
    }
  };

  const openClub = (clubId) => {
    window.location.href = `/club/${clubId}`;
  };

  const copyInviteLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const joinClub = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `http://localhost:5000/api/clubs/join/${inviteCode}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Joined club successfully");

      setInviteCode("");

      fetchClubs();
    } catch (err) {
      toast.error("Invalid invite code");
    }
  };

  const leaveClub = async (clubId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `http://localhost:5000/api/clubs/leave/${clubId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success("Left club");

      fetchClubs();

    } catch (error) {
      toast.error("Could not leave club");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">

        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          {/* Join Club */}
          <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="border p-2 rounded w-full md:w-60"
            />

            <button
              onClick={joinClub}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Join
            </button>
          </div>

          {/* Create Club */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
          >
            + Create Club
          </button>

        </div>

        <h1 className="text-2xl font-bold mb-6">Your Clubs</h1>

        {/* Clubs Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <div
              key={club._id}
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition"
            >
              <h2 className="font-bold text-lg">{club.name}</h2>

              <p className="text-gray-600 text-sm mt-1">
                {club.description}
              </p>

              <p className="text-sm mt-3">
                Invite Code:
                <span className="font-bold ml-1">{club.inviteCode}</span>
              </p>

              <button
                onClick={() => openClub(club._id)}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
              >
                Open Club
              </button>

              <button
                onClick={() => copyInviteLink(club.inviteCode)}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
              >
                Copy Invite Link
              </button>

              <button
                onClick={() => leaveClub(club._id)}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded w-full"
              >
                Leave Club
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Create Club Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl shadow-lg w-96">

            <h2 className="font-bold mb-4 text-lg">
              Create Club
            </h2>

            <form onSubmit={handleSubmit}>

              <input
                name="name"
                placeholder="Club name"
                onChange={handleChange}
                className="w-full border p-2 mb-3 rounded"
                required
              />

              <textarea
                name="description"
                placeholder="Description"
                onChange={handleChange}
                className="w-full border p-2 mb-3 rounded"
                required
              />

              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border px-4 py-2 rounded"
                >
                  Cancel
                </button>

                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Create
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Clubs;