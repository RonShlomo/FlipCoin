import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  const [isRegisterForm, setIsRegisterForm] = useState(false);
  const [details, setDetails] = useState({
    username: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isRegisterForm) {
      const response = await fetch("http://127.0.0.1:5050/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      const data = await response.json();
      if (!response.ok) toast.error(data.error || "Something went wrong!");
      else {
        localStorage.setItem("token", data.token);
        navigate("/dashboard", {
          state: {
            username: data.data.username,
            id: data.data.id,
          },
        });
      }
    } else {
      const response = await fetch(
        "https://flipcoin-express-server.onrender.com/users/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details),
        }
      );
      const data = await response.json();
      console.log(data);
      if (!response.ok) toast.error(data.error || "Something went wrong!");
      else localStorage.setItem("token", data.token);
      navigate("/onboarding", {
        state: { username: data.data.username, id: data.data.id },
      });
    }
  }

  const toggleForm = () => {
    setIsRegisterForm(!isRegisterForm);
  };

  return (
    <div className="container">
      <div className="header">
        <div className="text"> {isRegisterForm ? "Sign Up" : "Login"} </div>
        <div className="underline"></div>
      </div>
      <ToastContainer position="top-center" />
      {isRegisterForm ? (
        <form className="inputs" onSubmit={handleSubmit}>
          <div className="input">
            <i className="bi bi-person-circle"></i>
            <input
              onChange={(e) =>
                setDetails({ ...details, username: e.target.value })
              }
              type="text"
              placeholder="full name"
              value={details.username}
              required
            />
          </div>
          <div className="input">
            <i className="bi bi-envelope-at-fill"></i>
            <input
              onChange={(e) =>
                setDetails({ ...details, email: e.target.value })
              }
              type="email"
              placeholder="email"
              value={details.email}
              required
            />
          </div>
          <div className="input">
            <i className="bi bi-lock-fill"></i>
            <input
              onChange={(e) =>
                setDetails({ ...details, password: e.target.value })
              }
              type="password"
              placeholder="password"
              value={details.password}
              required
            />
          </div>
          <button className="submit">Sign Up</button>
        </form>
      ) : (
        <form className="inputs" onSubmit={handleSubmit}>
          <div className="input">
            <i className="bi bi-envelope-at-fill"></i>
            <input
              onChange={(e) =>
                setDetails({ ...details, email: e.target.value })
              }
              type="email"
              placeholder="email"
              value={details.email}
              required
            />
          </div>
          <div className="input">
            <i className="bi bi-lock-fill"></i>
            <input
              onChange={(e) =>
                setDetails({ ...details, password: e.target.value })
              }
              type="password"
              placeholder="password"
              value={details.password}
              required
            />
          </div>
          <button className="submit">Login</button>
        </form>
      )}

      <button id="changebtn" onClick={toggleForm}>
        {isRegisterForm
          ? "Already a member? Login here"
          : "Create a new account"}
      </button>
    </div>
  );
}
