import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { Document, Page, pdfjs } from "react-pdf";
import { motion } from "framer-motion";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

function Dashboard() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

      const data = new FormData();
      data.append("title", form.title);
      data.append("author", form.author);
      data.append("description", form.description);
      data.append("file", form.pdf);

      const clubId = "69a7bdec853d6beced78f95b";

      await axios.post(
        `http://localhost:5000/api/books/upload/${clubId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setShowModal(false);

      setForm({
        title: "",
        author: "",
        description: "",
        pdf: null,
      });

      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    pdf: null,
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:5000/api/books/user/books",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setBooks(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteBook = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/books/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  const currentlyReading = books.filter(
    (b) => b.progress && b.progress > 0 && b.progress < 100,
  ).length;

  const avgProgress =
    books.length > 0
      ? Math.round(
          books.reduce((a, b) => a + (b.progress || 0), 0) / books.length,
        )
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-900 text-white"
    >
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* HERO */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold">Welcome back 👋</h1>
          <p className="text-gray-200 mt-1">
            Discover, upload and discuss books with your clubs
          </p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-900 p-5 rounded-xl shadow hover:shadow-blue-500/20 transition">
            <p className="text-gray-400 text-sm">Books Uploaded</p>
            <h2 className="text-2xl font-bold">{books.length}</h2>
          </div>

          <div className="bg-gray-900 p-5 rounded-xl shadow hover:shadow-blue-500/20 transition">
            <p className="text-gray-400 text-sm">Currently Reading</p>
            <h2 className="text-2xl font-bold">{currentlyReading}</h2>
          </div>

          <div className="bg-gray-900 p-5 rounded-xl shadow hover:shadow-blue-500/20 transition">
            <p className="text-gray-400 text-sm">Reading Progress</p>
            <h2 className="text-2xl font-bold">{avgProgress}%</h2>
          </div>
        </div>

        {/* BOOKS */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              Your Library
              <span className="ml-2 text-sm text-gray-400">
                ({books.length})
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {loading &&
              Array(6)
                .fill()
                .map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-gray-800 h-64 rounded-lg"
                  />
                ))}

            {!loading &&
              books.map((book) => (
                <div
                  key={book._id}
                  className="group relative cursor-pointer transform transition duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                >
                  {/* BOOK COVER */}
                  {/* BOOK COVER */}
                  <div className="overflow-hidden rounded-lg shadow-lg">
                    <img
                      src={
                        book.coverImage ||
                        "https://placehold.co/200x300?text=Book"
                      }
                      alt="cover"
                      className="w-full h-64 object-cover"
                    />
                  </div>

                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-3 transition">
                    <a
                      href={`/viewer?file=${book.fileUrl}&bookId=${book._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-green-500 px-4 py-1 rounded text-sm"
                    >
                      📖 Read
                    </a>

                    <button
                      onClick={() => deleteBook(book._id)}
                      className="bg-red-500 px-4 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-gray-300 truncate">
                    {book.title}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* UPLOAD SECTION */}

        <div className="bg-gray-900 p-8 rounded-xl shadow text-center">
          <h3 className="font-bold text-lg mb-2">📚 Upload New Book</h3>

          <p className="text-gray-400 text-sm mb-4">
            Share knowledge with your club
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            + Upload
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center">
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-96">
            <h2 className="font-bold mb-4 text-lg">Upload Book</h2>

            <form onSubmit={handleSubmit}>
              <input
                name="title"
                placeholder="Title"
                value={form.title}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 p-2 mb-3 rounded"
                required
              />

              <input
                name="author"
                placeholder="Author"
                value={form.author}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 p-2 mb-3 rounded"
                required
              />

              <textarea
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 p-2 mb-3 rounded"
                required
              />

              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setForm({ ...form, pdf: e.target.files[0] })}
                className="w-full bg-gray-800 border border-gray-700 p-2 mb-3 rounded"
                required
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border border-gray-600 px-4 py-2 rounded"
                >
                  Cancel
                </button>

                <button type="submit" className="bg-blue-600 px-4 py-2 rounded">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default Dashboard;
