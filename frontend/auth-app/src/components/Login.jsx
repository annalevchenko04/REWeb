import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import ErrorMessage from "./ErrorMessage";
import { UserContext } from "../context/UserContext";

const Login = () => {
  const [Username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [, setToken] = useContext(UserContext);
  const navigate = useNavigate(); // Initialize useNavigate

  const submitLogin = async () => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: Username,
        password: password,
      }),
    };

    const response = await fetch("http://localhost:8000/token", requestOptions);
    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.detail);
    } else {
      setToken(data.access_token);
      localStorage.setItem("token", data.access_token);
      navigate("/profile"); // Redirect to the table page on successful login
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitLogin();
  };

  return (
    <div className="column">
      <form className="box" onSubmit={handleSubmit}>
        <h1 className="title has-text-centered">Login</h1>
        <div className="field">
          <label className="label">Email</label>
          <div className="control">
            <input
              type="text"
              placeholder="Enter email"
              value={Username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>
        <div className="field">
          <label className="label">Password</label>
          <div className="control">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>
        <ErrorMessage message={errorMessage} />
        <br />
        <div style={{ textAlign: "center" }}>
          <button className="button is-primary" type="submit">
            Login
          </button>
        </div>
        <p className="has-text-centered mt-3">
          No? Back to <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
