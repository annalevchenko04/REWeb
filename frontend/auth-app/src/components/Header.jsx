import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";

import { UserContext } from "../context/UserContext";

const Header = ({ title }) => {
  const [token, setToken] = useContext(UserContext);
  const navigate = useNavigate(); // Initialize useNavigate


  const handleLogout = () => {
    setToken(null);
    navigate("/login");
  };

  return (
      <div className="has-text-centered m-6">
          {token && (
              <button className="button" onClick={handleLogout}>
                  Logout
              </button>
          )}
          <h1 style={{fontSize: "56px", fontWeight: "bold"}}>{title}</h1>
      </div>
  );
};

export default Header;