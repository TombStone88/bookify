import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function Dashboard() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    file: null,
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const res = await axios.get("http://localhost:5000/api/books/user/books", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setBooks(res.data);
    setLoading(false);
  };

  const deleteBook = async (id) => {
    await axios.delete(`http://localhost:5000/api/books/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchBooks();
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();

    data.append("title", form.title);
    data.append("author", form.author);
    data.append("description", form.description);
    data.append("file", form.file);

    // ✅ personal upload (NO clubId)
    await axios.post("http://localhost:5000/api/books/upload", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setShowModal(false);
    setForm({ title: "", author: "", description: "", file: null });
    fetchBooks();
  };

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
    <div className="min-h-screen bg-white flex justify-center py-10">
      <div className="w-[95%] min-h-[90vh] rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-pink-600 shadow-xl p-10">
        <Navbar />

        {/* HERO */}
        <div className="text-center text-white mb-12">
          <h1 className="text-5xl font-bold">Welcome back 👋</h1>
          <p className="mt-2 opacity-90">Your personal book universe</p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { title: "Books Uploaded", value: books.length },
            { title: "Currently Reading", value: currentlyReading },
            { title: "Reading Progress", value: avgProgress + "%" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white text-black p-6 rounded-xl hover:scale-105 transition"
            >
              <p className="text-gray-500">{item.title}</p>
              <h2 className="text-2xl font-bold">{item.value}</h2>
            </div>
          ))}
        </div>

        {/* HEADER + ADD BUTTON */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">
            Your Library ({books.length})
          </h2>

          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-pink-600 px-4 py-2 rounded-lg font-semibold hover:scale-105 transition"
          >
            + Add Book
          </button>
        </div>

        {/* LIBRARY */}
        <div className="bg-white rounded-2xl p-8 mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {books.map((book) => (
              <div
                key={book._id}
                className="group relative cursor-pointer hover:scale-105 transition"
                onClick={() => setSelectedBook(book)}
              >
                <img
                  src={
                    book.coverImage ||
                    "https://placehold.co/150x220?text=No+Cover"
                  }
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/150x220?text=No+Cover";
                  }}
                  className="h-52 w-full object-cover rounded"
                />

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-3 transition rounded-lg">
                  <a
                    href={`/viewer?file=${book.fileUrl}&bookId=${book._id}`}
                    target="_blank"
                    className="bg-green-500 px-4 py-1 rounded text-white text-sm"
                  >
                    Read
                  </a>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBook(book._id);
                    }}
                    className="bg-red-500 px-4 py-1 rounded text-white text-sm"
                  >
                    Delete
                  </button>
                </div>

                <p className="text-sm mt-2 text-gray-700 truncate">
                  {book.title}
                </p>
              </div>
            ))}
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
              onClick={(e) => e.stopPropagation()}
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

export default Dashboard;