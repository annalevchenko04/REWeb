import React, { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const UserContext = createContext();

export const UserProvider = (props) => {
    const [token, setToken] = useState(localStorage.getItem("token"));  // Get token from localStorage initially
    const navigate = useNavigate();

    // Handle logout: clear token from state and localStorage
    const handleLogout = () => {
        setToken(null);  // Clear token state
        localStorage.removeItem("token");  // Remove token from localStorage
    };

    useEffect(() => {
        if (token) {
            // If token exists, verify it with the server
            const fetchUser = async () => {
                try {
                    const requestOptions = {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`  // Pass the token in the header
                        }
                    };

                    const response = await fetch(`http://localhost:8000/verify-token/${token}`, requestOptions);
                    if (response.ok) {
                        const data = await response.json();
                        setToken(data.access_token);  // Update token if response is successful
                        localStorage.setItem("token", data.access_token);  // Update token in localStorage
                    } else {
                        handleLogout();  // Logout if token verification fails
                    }
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    handleLogout();  // Logout in case of error
                }
            };

            fetchUser();
        } else {
            handleLogout();  // Logout if no token is present
        }
    }, [token, navigate]);  // Re-run effect if token or navigate changes

    return (
        <UserContext.Provider value={[token, setToken]}>
            {props.children}
        </UserContext.Provider>
    );
};
