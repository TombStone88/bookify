import React, { useState } from "react";
import axios from "axios";

function Auth() {

  const [isLogin, setIsLogin] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      if (isLogin) {

        const res = await axios.post(
          "http://localhost:5000/api/auth/login",
          {
            email: form.email,
            password: form.password
          }
        );

        localStorage.setItem("token", res.data.token);

        setMessage("Login successful ✅");

        window.location.href = "/dashboard";

      } else {

        const res = await axios.post(
          "http://localhost:5000/api/auth/register",
          form
        );

        setMessage(res.data.message);
      }

    } catch (error) {

      setMessage(
        error.response?.data?.message || "Something went wrong"
      );

    }
  };

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">

      <div className="bg-white p-8 rounded-xl shadow-2xl w-96">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          📚 Book Club
        </h1>

        <p className="text-center text-gray-500 mb-6">
          {isLogin ? "Welcome back!" : "Create your account"}
        </p>

        {/* Toggle buttons */}
        <div className="flex mb-6 bg-gray-200 rounded-lg overflow-hidden">

          <button
            onClick={() => setIsLogin(true)}
            className={`w-1/2 py-2 font-semibold transition ${
              isLogin
                ? "bg-blue-600 text-white"
                : "text-gray-600"
            }`}
          >
            Login
          </button>

          <button
            onClick={() => setIsLogin(false)}
            className={`w-1/2 py-2 font-semibold transition ${
              !isLogin
                ? "bg-blue-600 text-white"
                : "text-gray-600"
            }`}
          >
            Register
          </button>

        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email address"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
          />

          <button
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
          >
            {isLogin ? "Login" : "Register"}
          </button>

        </form>

        {/* Message */}
        {message && (
          <p className="text-center mt-4 text-green-600 font-medium">
            {message}
          </p>
        )}

      </div>

    </div>

  );
}

export default Auth;