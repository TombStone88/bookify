import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function ClubDashboard() {

  const { clubId } = useParams();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch messages for this club
  useEffect(() => {

    fetchMessages();

  }, [clubId]);

  const fetchMessages = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await axios.get(
        `http://localhost:5000/api/messages/${clubId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessages(res.data);

      setLoading(false);

    } catch (error) {

      console.error(error);

      setLoading(false);

    }

  };

  // Send message
  const sendMessage = async () => {

    if (!text.trim()) return;

    try {

      const token = localStorage.getItem("token");

      await axios.post(
        `http://localhost:5000/api/messages/send/${clubId}`,
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setText("");

      fetchMessages();

    } catch (error) {

      console.error(error);

    }

  };

  return (

    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <div className="max-w-4xl mx-auto p-6">

        <h1 className="text-2xl font-bold mb-4">
          Club Chat
        </h1>

        {/* Chat box */}
        <div className="bg-white rounded-xl shadow p-4 h-96 overflow-y-auto">

          {loading ? (

            <p>Loading messages...</p>

          ) : messages.length === 0 ? (

            <p>No messages yet</p>

          ) : (

            messages.map(msg => (

              <div key={msg._id} className="mb-3">

                <span className="font-bold text-blue-600">
                  {msg.sender?.name}
                </span>

                <span className="ml-2">
                  {msg.text}
                </span>

                <div className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </div>

              </div>

            ))

          )}

        </div>

        {/* Input */}
        <div className="flex gap-2 mt-4">

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Type message..."
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send
          </button>

        </div>

      </div>

    </div>

  );

}

export default ClubDashboard;