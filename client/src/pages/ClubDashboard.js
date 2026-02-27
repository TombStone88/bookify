import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function ClubDashboard() {

  const { clubId } = useParams();

  const token = localStorage.getItem("token");

  const userId =
    JSON.parse(atob(token.split(".")[1])).userId;

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
    file: null
  });

  useEffect(() => {

    fetchMessages();
    fetchBooks();
    fetchMembers();

  }, [clubId]);

  // FETCH MEMBERS
  const fetchMembers = async () => {

    try {

      const res = await axios.get(
        `http://localhost:5000/api/clubs/members/${clubId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchMembers();

    } catch (error) {

      console.error(error);

    }

  };

  // DELETE CLUB
  const deleteClub = async () => {

    const confirmDelete = window.confirm(
      "Delete this club?"
    );

    if (!confirmDelete) return;

    try {

      await axios.delete(
        `http://localhost:5000/api/clubs/delete/${clubId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Club deleted");

      window.location.href = "/clubs";

    } catch (error) {

      console.error(error);

    }

  };

  // FETCH BOOKS
  const fetchBooks = async () => {

    const res = await axios.get(
      `http://localhost:5000/api/books/${clubId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setBooks(res.data);

  };

  // FETCH CHAT
  const fetchMessages = async () => {

    const res = await axios.get(
      `http://localhost:5000/api/messages/${clubId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setMessages(res.data);

  };

  // SEND MESSAGE
  const sendMessage = async () => {

    if (!text.trim()) return;

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

  };

  // FORM CHANGE
  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleFileChange = (e) => {

    setForm({
      ...form,
      file: e.target.files[0]
    });

  };

  // UPLOAD BOOK
  const handleSubmit = async (e) => {

    e.preventDefault();

    const data = new FormData();

    data.append("title", form.title);
    data.append("author", form.author);
    data.append("description", form.description);
    data.append("file", form.file);

    await axios.post(
      `http://localhost:5000/api/books/upload/${clubId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setShowModal(false);

    fetchBooks();

  };

  return (

    <div className="h-screen flex flex-col">

      <Navbar />

      <div className="flex flex-1">

        {/* LEFT SIDEBAR */}
        <div className="w-72 bg-white border-r p-3 overflow-y-auto">

          <div className="flex justify-between items-center mb-3">

            <h2 className="font-bold">
              Books
            </h2>

            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
            >
              +
            </button>

          </div>

          {/* DELETE CLUB BUTTON */}
          {adminId === userId && (

            <button
              onClick={deleteClub}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs mb-3"
            >
              Delete Club
            </button>

          )}

          {/* BOOK LIST */}
          {books.map(book => (

            <div
              key={book._id}
              className="mb-3 border-b pb-2"
            >

              <div className="flex gap-2">

                <img
                  src={book.coverImage}
                  className="w-10 h-14 object-cover rounded"
                  alt="cover"
                />

                <div>

                  <div className="font-semibold text-sm">
                    {book.title}
                  </div>

                  <div className="text-gray-500 text-xs">
                    {book.author}
                  </div>

                </div>

              </div>

              {/* VIEW & DOWNLOAD */}
              <div className="flex gap-2 mt-1">

                <a
                  href={`/viewer?file=${encodeURIComponent(book.fileUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-600 text-xs"
                >
                  View
                </a>

                <a
                  href={book.fileUrl}
                  download
                  className="text-blue-600 text-xs"
                >
                  Download
                </a>

              </div>

            </div>

          ))}

          {/* MEMBERS */}
          <div className="mt-4">

            <h3 className="font-bold mb-2">
              Members
            </h3>

            {members.map(member => (

              <div
                key={member._id}
                className="flex justify-between items-center text-sm mb-1"
              >

                <span>

                  {member._id.toString() === adminId ? (

                    <span className="text-yellow-600 font-semibold">
                      👑 {member.name}
                    </span>

                  ) : (

                    <span>
                      👤 {member.name}
                    </span>

                  )}

                </span>

                {adminId === userId &&
                 member._id.toString() !== adminId && (

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

        {/* CHAT AREA */}
        <div className="flex flex-col flex-1">

          <div className="flex-1 p-4 overflow-y-auto bg-gray-100">

            {messages.map(msg => (

              <div key={msg._id}>

                <b>{msg.sender?.name}:</b>
                <span className="ml-2">
                  {msg.text}
                </span>

              </div>

            ))}

          </div>

          <div className="p-3 bg-white border-t flex gap-2">

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 border p-2 rounded"
            />

            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 rounded"
            >
              Send
            </button>

          </div>

        </div>

      </div>

      {/* UPLOAD MODAL */}
      {showModal && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">

          <div className="bg-white p-5 rounded w-96">

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

              <button className="bg-blue-600 text-white w-full py-2 mt-3 rounded">
                Upload
              </button>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}

export default ClubDashboard;