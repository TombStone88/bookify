import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function Clubs() {

  const [clubs, setClubs] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:5000/api/clubs/my-clubs",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setClubs(res.data);

    } catch (error) {

      console.error(error);

    }

  };

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/api/clubs/create",
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setShowModal(false);

      setForm({
        name: "",
        description: ""
      });

      fetchClubs();

    } catch (error) {

      console.error(error);

    }

  };

  const openClub = (clubId) => {

    window.location.href = `/club/${clubId}`;

  };

  const copyInviteLink = (inviteCode) => {

    const link = `${window.location.origin}/join/${inviteCode}`;

    navigator.clipboard.writeText(link);

    alert("Invite link copied!");

  };

  return (

    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <div className="max-w-7xl mx-auto p-6">

        <div className="flex justify-between items-center mb-6">

          <h1 className="text-2xl font-bold">
            Your Clubs
          </h1>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ➕ Create Club
          </button>

        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {clubs.map(club => (

            <div
              key={club._id}
              className="bg-white p-5 rounded-xl shadow"
            >

              <h2 className="font-bold text-lg">
                {club.name}
              </h2>

              <p className="text-gray-600 text-sm">
                {club.description}
              </p>

              <p className="text-sm mt-2">
                Invite Code:
                <span className="font-bold ml-1">
                  {club.inviteCode}
                </span>
              </p>

              <button
                onClick={() => openClub(club._id)}
                className="mt-3 bg-green-600 text-white px-4 py-2 rounded w-full"
              >
                Open Club
              </button>

              <button
                onClick={() => copyInviteLink(club.inviteCode)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded w-full"
              >
                Copy Invite Link
              </button>

            </div>

          ))}

        </div>

      </div>

      {showModal && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl shadow-lg w-96">

            <h2 className="font-bold mb-4">
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

                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
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