import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import socket from "../socket";

function ClubDashboard() {
  const { clubId } = useParams();
  //const socket = io("http://localhost:5000");
  const token = localStorage.getItem("token") || "";

  const userId = JSON.parse(atob(token.split(".")[1])).userId;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [books, setBooks] = useState([]);

  const [members, setMembers] = useState([]);
  const [adminId, setAdminId] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    file: null,
  });

  useEffect(() => {
    fetchMessages();
    fetchBooks();
    fetchMembers();

    socket.emit("joinClub", clubId);

    socket.on("receiveMessage", (message) => {
  setMessages((prev) => {
    // avoid duplicate message
    if (prev.find((m) => m._id === message._id)) return prev;
    return [...prev, message];
  });
});

    return () => {
      socket.off("receiveMessage");
    };
  }, [clubId]);

  console.log("TOKEN:", token);
  // FETCH MEMBERS
  const fetchMembers = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/clubs/members/${clubId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMembers(res.data.members);
      setAdminId(res.data.admin);
    } catch (error) {
      console.error(error);
    }
  };

  // REMOVE MEMBER
  const removeMember = async (memberId) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/clubs/remove-member/${clubId}/${memberId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      fetchMembers();
    } catch (error) {
      console.error(error);
    }
  };

  // DELETE CLUB
  const deleteClub = async () => {
    const confirmDelete = window.confirm("Delete this club?");

    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:5000/api/clubs/delete/${clubId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Club deleted");

      window.location.href = "/clubs";
    } catch (error) {
      console.error(error);
    }
  };

  // FETCH BOOKS
  const fetchBooks = async () => {
    const res = await axios.get(`http://localhost:5000/api/books/${clubId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setBooks(res.data);
  };


  // FETCH CHAT
  const fetchMessages = async () => {
    const res = await axios.get(
      `http://localhost:5000/api/messages/${clubId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    setMessages(res.data);
  };

  // SEND MESSAGE
 const sendMessage = async () => {

  if (!text.trim()) return;

  try {
    const res = await axios.post(
      `http://localhost:5000/api/messages/send/${clubId}`,
      { text },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const newMessage = res.data;

    // ✅ 1. Update UI immediately
    setMessages((prev) => [...prev, newMessage]);

    // ✅ 2. Emit to others
    socket.emit("sendMessage", newMessage);

    setText("");

  } catch (err) {
    console.error(err);
  }
};

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setForm({
      ...form,
      file: e.target.files[0],
    });
  };

  // UPLOAD BOOK
  const handleSubmit = async (e) => {
  e.preventDefault();

  console.log("Uploading with clubId:", clubId);
  const data = new FormData();

  data.append("title", form.title);
  data.append("author", form.author);
  data.append("description", form.description);
  data.append("file", form.file);

  // ✅ THIS IS CRITICAL
  data.append("clubId", clubId);

  await axios.post("http://localhost:5000/api/books/upload", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    
  });

  setShowModal(false);
  fetchBooks();
};

  return (
    <div className="min-h-screen bg-white flex justify-center py-10">
      {/* SAME CONTAINER AS HOME */}
      <div className="w-[95%] min-h-[90vh] rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-pink-600 shadow-xl p-10">
        <Navbar />

        {/* HEADER (MATCH STYLE) */}
        <div className="text-center text-white mb-12">
          <h1 className="text-5xl font-bold">Club Dashboard 📚</h1>
          <p className="mt-2 opacity-90">Connect, chat and share books</p>
        </div>

        {/* 3 PANEL LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEFT - BOOKS */}
          <div className="bg-white text-black p-6 rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">📚 Books</h2>

              <button
                onClick={() => setShowModal(true)}
                className="bg-pink-500 text-white px-3 py-1 rounded text-sm"
              >
                + Add
              </button>
            </div>

            {adminId === userId && (
              <button
                onClick={deleteClub}
                className="bg-red-500 text-white px-3 py-1 rounded text-xs mb-4 w-full"
              >
                Delete Club
              </button>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {books.map((book) => (
                <div key={book._id} className="flex gap-3">
                  <img
                    src={book.coverImage}
                    className="w-12 h-16 object-cover rounded"
                    alt="cover"
                  />

                  <div>
                    <div className="text-sm font-semibold">{book.title}</div>

                    <div className="text-xs text-gray-500">{book.author}</div>

                    <div className="flex gap-2 text-xs mt-1">
                      <a
                        href={`/viewer?file=${encodeURIComponent(book.fileUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-600"
                      >
                        View
                      </a>

                      <a href={book.fileUrl} download className="text-blue-600">
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER - CHAT */}
          <div className="bg-white rounded-xl shadow flex flex-col h-[500px]">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const isMe =
                  msg.sender?._id === userId ||
                  msg.sender === userId ||
                  msg.sender?.userId === userId;

                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-5 py-2 rounded-xl max-w-xs
                      ${isMe ? "bg-pink-500 text-white" : "bg-gray-200"}`}
                    >
                      <div className="text-xs font-semibold mb-1">
                        {typeof msg.sender === "object"
                          ? msg.sender?.name || msg.sender?.username || "User"
                          : msg.sender || "User"}
                      </div>

                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 bg-gray-100 p-2 rounded"
                placeholder="Type a message..."
              />

              <button
                onClick={sendMessage}
                className="bg-pink-500 text-white px-4 rounded"
              >
                Send
              </button>
            </div>
          </div>

          {/* RIGHT - MEMBERS */}
          <div className="bg-white text-black p-6 rounded-xl shadow">
            <h3 className="font-semibold mb-4">👥 Members</h3>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex justify-between items-center text-sm"
                >
                  <span>
                    {member._id.toString() === adminId ? (
                      <span className="text-yellow-600 font-semibold">
                        👑 {member.name || member.username}
                      </span>
                    ) : (
                      <span>👤 {member.name || member.username}</span>
                    )}
                  </span>

                  {adminId === userId && member._id.toString() !== adminId && (
                    <button
                      onClick={() => removeMember(member._id)}
                      className="text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
  <div
    className="fixed inset-0 bg-black/50 flex justify-center items-center"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowModal(false);
      }
    }}
  >
    <div
      className="bg-white p-6 rounded-xl w-96"
      onClick={(e) => e.stopPropagation()}  // 👈 THIS IS THE FIX
    >
      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="Title"
          onChange={handleChange}
          className="w-full border p-2 mb-2"
          required
        />

        <input
          name="author"
          placeholder="Author"
          onChange={handleChange}
          className="w-full border p-2 mb-2"
          required
        />

        <textarea
          name="description"
          placeholder="Description"
          onChange={handleChange}
          className="w-full border p-2 mb-2"
        />

        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          required
        />

        <button
          type="submit"
          className="bg-pink-500 text-white w-full py-2 mt-3 rounded"
        >
          Upload
        </button>
      </form>
    </div>
  </div>
)}
      </div>
    </div>
  );
}


export default ClubDashboard;
