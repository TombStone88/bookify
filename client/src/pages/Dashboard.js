import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function Dashboard() {
  const [books, setBooks] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [commentText, setCommentText] = useState("");

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBooks(res.data);
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
        }
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

  const deleteBook = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/books/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  /* Dashboard Stats */

  const currentlyReading = books.filter(
    (b) => b.progress && b.progress > 0 && b.progress < 100
  ).length;

  const avgProgress =
    books.length > 0
      ? Math.round(
          books.reduce((a, b) => a + (b.progress || 0), 0) / books.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Welcome back 👋</h1>
          <p className="text-gray-600 mt-1">
            Discover, upload and discuss books with your clubs
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Books Uploaded</p>
            <h2 className="text-2xl font-bold">{books.length}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Currently Reading</p>
            <h2 className="text-2xl font-bold">{currentlyReading}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Reading Progress</p>
            <h2 className="text-2xl font-bold">{avgProgress}%</h2>
          </div>
        </div>

        {/* Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Books */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Your Books</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {books.map((book) => (
                <div
                  key={book._id}
                  className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
                >
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-60 object-cover rounded-md"
                  />

                  <h3 className="font-bold mt-3">{book.title}</h3>

                  <p className="text-gray-600 text-sm">{book.author}</p>

                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${book.progress || 0}%`,
                      }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Progress: {book.progress || 0}%
                  </p>

                  <div className="flex justify-between mt-3">
                    <a
                      href={`/viewer?file=${book.fileUrl}&bookId=${book._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-600"
                    >
                      📖 Continue
                    </a>

                    <button
                      onClick={() => deleteBook(book._id)}
                      className="text-red-600"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow text-center">
              <h3 className="font-bold text-lg mb-2">Upload New Book</h3>

              <p className="text-gray-500 text-sm mb-4">
                Share knowledge with your club
              </p>

              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
              >
                + Upload
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold mb-3">Recent Activity</h3>

              <div className="space-y-2 text-sm text-gray-600">
                <p>📚 Books uploaded: {books.length}</p>
                <p>📖 Currently reading: {currentlyReading}</p>
                <p>📊 Avg progress: {avgProgress}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h2 className="font-bold mb-4">Upload Book</h2>

            <form onSubmit={handleSubmit}>
              <input
                name="title"
                placeholder="Title"
                value={form.title}
                onChange={handleChange}
                className="w-full border p-2 mb-3 rounded"
                required
              />

              <input
                name="author"
                placeholder="Author"
                value={form.author}
                onChange={handleChange}
                className="w-full border p-2 mb-3 rounded"
                required
              />

              <textarea
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleChange}
                className="w-full border p-2 mb-3 rounded"
                required
              />

              <label className="text-sm">Book PDF</label>

              <input
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  setForm({ ...form, pdf: e.target.files[0] })
                }
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
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;