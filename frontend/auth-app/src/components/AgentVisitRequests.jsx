import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/UserContext';
import { Link, useParams } from "react-router-dom";

const AgentVisitRequests = () => {
    const [token] = useContext(UserContext);
    const [visitRequests, setVisitRequests] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [properties, setProperties] = useState([]);
    const { user_id } = useParams();
    const [usernames, setUsernames] = useState({});
    const [sortOrder, setSortOrder] = useState("newest");

    const formatDate = (dateString) => {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        };
        return new Intl.DateTimeFormat('en-US', options).format(new Date(dateString));
    };

    useEffect(() => {
        const fetchVisitRequests = async () => {
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };

            try {
                const response = await fetch(`http://localhost:8000/users/${user_id}/agent-visit-requests`, requestOptions);
                if (!response.ok) throw new Error('Failed to load visit requests.');
                const data = await response.json();
                setVisitRequests(data);

                // Now fetch usernames for each visit request
                const userIds = data.map(request => request.user_id);
                const uniqueUserIds = [...new Set(userIds)]; // Get unique user IDs
                const userPromises = uniqueUserIds.map(async (user_id) => {
                    const userResponse = await fetch(`http://localhost:8000/users/id/${user_id}`, requestOptions);
                    if (!userResponse.ok) throw new Error("Failed to load user.");
                    const userData = await userResponse.json();
                    return { user_id, username: userData.username }; // Return the userId and username
                });

                // Once all user data is fetched, store it in state
                const userData = await Promise.all(userPromises);
                const userMapping = userData.reduce((acc, { user_id, username }) => {
                    acc[user_id] = username; // Map user_id to username
                    return acc;
                }, {});

                console.log('Usernames Mapping:', userMapping); // Debugging line
                setUsernames(userMapping); // Store the username mapping in state

            } catch (error) {
                setErrorMessage(error.message || "Failed to load visit requests.");
            }
        };

        fetchVisitRequests();
    }, [token, user_id]);

    const updateRequestStatus = async (requestId, newStatus) => {
        const requestOptions = {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            const response = await fetch(`http://127.0.0.1:8000/visit-request/${requestId}/status?status=${newStatus}`, requestOptions);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update status");
            }
            const updatedRequest = await response.json();
            setVisitRequests((prevRequests) =>
                prevRequests.map((req) =>
                    req.id === requestId ? { ...req, status: updatedRequest.status } : req
                )
            );
        } catch (error) {
            console.error("Error updating status:", error.message);
            setErrorMessage(error.message || "Failed to update status");
        }
    };

    useEffect(() => {
        const fetchProperties = async () => {
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };

            try {
                const response = await fetch(`http://localhost:8000/properties`, requestOptions);
                if (!response.ok) throw new Error("Failed to load properties.");
                const data = await response.json();
                setProperties(data);
            } catch (error) {
                setErrorMessage("Failed to load properties. Please try again later.");
            }
        };

        fetchProperties();
    }, [token]);

    const getPropertyTitle = (propertyId) => {
        const property = properties.find((prop) => prop.id === propertyId);
        return property ? property.title : "Title Not Available";
    };

    const sortedVisitRequests = [...visitRequests].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return (
        <div className="container">
            <Link to="/profile" className="button is-primary">Back to Profile</Link>
            <br /><br />
            <h1 className="title is-3">Visit Requests for Your Properties</h1>
            {errorMessage && <p className="has-text-danger">{errorMessage}</p>}

            <div className="sort-options">
                <label className="label">Sort by: </label>
                <div className="control">
                    <div className="select">
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                        </select>
                    </div>
                </div>
            </div>
            <br /><br />

            <div className="scrollable-container">
                {sortedVisitRequests.length > 0 ? (
                    sortedVisitRequests.map((request) => (
                        <div key={request.id} className="box" style={{position: 'relative'}}>
                            <span style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                fontSize: '0.9em',
                                color: '#888'
                            }}>
                                {formatDate(request.created_at)}
                            </span>
                            <br/>
                            <p>
                                <strong>Property:</strong>{' '}
                                <Link
                                    to={`/property/${request.property_id}`}
                                    style={{textDecoration: 'underline', color: 'blue'}}
                                >
                                    {getPropertyTitle(request.property_id)}
                                </Link>
                            </p>
                            <p><strong>From:</strong> {usernames[request.user_id] || "Username Not Found"}
                            </p> {/* Display username */}
                            <p>
                                <strong>Message:</strong>{' '}
                                {request.message ||
                                    <span style={{fontStyle: 'italic', color: '#999'}}>No message provided</span>}
                            </p>
                            <p><strong>Requested Visit Date:</strong> {formatDate(request.visit_date)}</p>
                            <p><strong>Status:</strong> {request.status}</p>
                            <div style={{marginTop: '10px'}}>
                                <button
                                    onClick={() => updateRequestStatus(request.id, 'accepted')}
                                    className="button is-success is-small"
                                    disabled={request.status === 'accepted'}
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => updateRequestStatus(request.id, 'declined')}
                                    className="button is-danger is-small"
                                    style={{marginLeft: '5px'}}
                                    disabled={request.status === 'declined'}
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No visit requests found.</p>
                )}
            </div>
        </div>
    );
};

export default AgentVisitRequests;
