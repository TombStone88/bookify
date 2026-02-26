import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function Dashboard() {

  const [books, setBooks] = useState([]);

  // Add Book Modal
  const [showModal, setShowModal] = useState(false);

  // Comment Modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [commentText, setCommentText] = useState("");

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: ""
  });

  // Fetch books
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/books/all"
      );

      setBooks(res.data);

    } catch (error) {

      console.error(error);

    }

  };

  // Form change
  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  // Add Book
  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/api/books/add",
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setShowModal(false);

      setForm({
        title: "",
        author: "",
        description: ""
      });

      fetchBooks();

    } catch (error) {

      console.error(error);

    }

  };

  // Like Book
  const handleLike = async (id) => {

    try {

      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/api/books/like/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchBooks();

    } catch (error) {

      console.error(error);

    }

  };

  // Open comment modal
  const openComments = (book) => {

    setSelectedBook(book);

    setShowCommentModal(true);

  };

  // Submit comment
  const submitComment = async () => {

    try {

      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5000/api/books/comment/${selectedBook._id}`,
        {
          text: commentText
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setCommentText("");

      fetchBooks();

    } catch (error) {

      console.error(error);

    }

  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <Navbar onAddClick={() => setShowModal(true)} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Books</h1>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Book
          </button>
        </div>

        {/* Book Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {books.map((book) => (
            <div
              key={book._id}
              className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
            >
              <h3 className="font-bold">{book.title}</h3>

              <p className="text-gray-600 text-sm">{book.author}</p>

              <p className="mt-2 text-sm">{book.description}</p>

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => handleLike(book._id)}
                  className="text-red-500 hover:scale-110 transition"
                >
                  ❤️ {book.likes.length}
                </button>

                <button
                  onClick={() => openComments(book)}
                  className="text-blue-600"
                >
                  💬 {book.comments.length}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Book Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h2 className="font-bold mb-4">Add Book</h2>

            <form onSubmit={handleSubmit}>
              <input
                name="title"
                placeholder="Title"
                onChange={handleChange}
                className="w-full border p-2 mb-3 rounded"
                required
              />

              <input
                name="author"
                placeholder="Author"
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

                <button className="bg-blue-600 text-white px-4 py-2 rounded">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h2 className="font-bold mb-3">Comments</h2>

            <div className="max-h-40 overflow-y-auto mb-3">
              {selectedBook.comments.map((c, i) => (
                <div key={i} className="border-b py-1 text-sm">
                  {c.text}
                </div>
              ))}
            </div>

            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write comment"
              className="w-full border p-2 mb-3 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCommentModal(false)}
                className="border px-4 py-2 rounded"
              >
                Close
              </button>

              <button
                onClick={submitComment}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

export default Dashboard;