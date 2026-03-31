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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowModal(false);
      setForm({ name: "", description: "" });
      fetchClubs();
    } catch (error) {
      console.error(error);
    }
  };

  const openClub = (clubId) => {
    window.location.href = `/club/${clubId}`;
  };

  const copyInviteLink = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  const joinClub = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `http://localhost:5000/api/clubs/join/${inviteCode}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
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
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Left club");
      fetchClubs();
    } catch (error) {
      toast.error("Could not leave club");
    }
  };

  const [text, setText] = useState("");
const fullText = "Your Clubs 👥";

useEffect(() => {
  let i = 0;
  const interval = setInterval(() => {
    setText(fullText.slice(0, i + 1));
    i++;
    if (i === fullText.length) clearInterval(interval);
  }, 70);

  return () => clearInterval(interval);
}, []);

  return (
    <div className="min-h-screen bg-white flex justify-center py-10">
      <div className="w-[95%] min-h-[90vh] rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-pink-600 shadow-xl p-10">

        <Navbar />

        {/* HERO with typing */}
        <div className="text-center text-white mb-12">
          <h1 className="text-5xl font-bold">
  {text}
  <span className="animate-pulse">|</span>
</h1>
          <p className="mt-2 opacity-90">
            Connect, share, and grow together
          </p>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid lg:grid-cols-4 gap-10">

          {/* LEFT → CLUBS */}
          <div className="lg:col-span-3">
            <div className="grid sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {clubs.map((club) => {
                const members = club.members?.length || Math.floor(Math.random() * 50 + 5);
                const isActive = Math.random() > 0.5;

                return (
                  <div
                    key={club._id}
                    className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition border border-white/40"
                  >

                    {/* HEADER */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center text-white font-bold">
                        {club.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h2 className="font-semibold text-gray-800">
                          {club.name}
                        </h2>
                        <p className="text-xs text-gray-400">
                          {members} members
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                      {club.description}
                    </p>

                    {/* ACTIVITY */}
                    <div className="flex items-center gap-2 text-xs mb-3">
                      <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-gray-500">
                        {isActive ? "Active" : "Low activity"}
                      </span>
                    </div>

                    {/* CODE */}
                    <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block mb-4">
                      {club.inviteCode}
                    </div>

                    {/* BUTTONS */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openClub(club._id)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg"
                      >
                        Open
                      </button>

                      <button
                        onClick={() => copyInviteLink(club.inviteCode)}
                        className="bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
                      >
                        Copy
                      </button>

                      <button
                        onClick={() => leaveClub(club._id)}
                        className="text-red-500 py-2 rounded-lg hover:bg-red-50"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* RIGHT → ACTION PANEL */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg h-fit border border-white/40 flex flex-col gap-6">

  {/* JOIN SECTION */}
  <div>
    <h2 className="font-semibold mb-3 text-gray-700">
      Join a Club
    </h2>

    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Invite code..."
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        className="flex-1 border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-pink-400"
      />

      <button
        onClick={joinClub}
        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 rounded-lg font-medium hover:scale-105 transition"
      >
        Join
      </button>
    </div>
  </div>

  {/* DIVIDER */}
  <div className="border-t border-gray-200"></div>

  {/* CREATE SECTION */}
  <div>
    <h2 className="font-semibold mb-3 text-gray-700">
      Create a Club
    </h2>

    <button
      onClick={() => setShowModal(true)}
      className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 rounded-lg font-medium hover:scale-105 transition"
    >
      + Create Club
    </button>
  </div>

</div>
        </div>

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

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

                <button className="bg-pink-500 text-white px-4 py-2 rounded">
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