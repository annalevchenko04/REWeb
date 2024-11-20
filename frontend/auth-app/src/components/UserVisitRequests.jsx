import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/UserContext';
import { Link, useParams } from "react-router-dom";

const UserVisitRequests = () => {
    const [token] = useContext(UserContext);
    const [visitRequests, setVisitRequests] = useState([]);
    const [properties, setProperties] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [statusFilter, setStatusFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const { user_id } = useParams();

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
                const response = await fetch(`http://localhost:8000/users/${user_id}/visit-requests`, requestOptions);
                if (!response.ok) throw new Error('Failed to load visit requests.');
                const data = await response.json();
                setVisitRequests(data);
            } catch (error) {
                setErrorMessage(error.message || "Failed to load visit requests.");
            }
        };

        fetchVisitRequests();
    }, [token, user_id]);

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

    const getStatusColor = (status) => {
        switch (status) {
            case 'accepted':
                return '#d4edda'; // Light green for accepted
            case 'declined':
                return '#f8d7da'; // Light red for declined
            default:
                return '#ffffff'; // Default color for pending
        }
    };

      const sortedVisitRequests = [...visitRequests].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    const filteredVisitRequests = sortedVisitRequests.filter((request) => {
        const matchesStatus = statusFilter ? request.status === statusFilter : true;
        const matchesSearch = searchQuery
            ? request.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              getPropertyTitle(request.property_id)?.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        return matchesStatus && matchesSearch;
    });


    return (
        <div className="container">
            <Link to="/profile" className="button is-primary">
                Back to Profile
            </Link>
            <br/>
            <br/>
            <h1 className="title is-3">My Visit Requests</h1>

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

            <div className="field">
                <label className="label">Filter by Status</label>
                <div className="control">
                    <div className="select">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                        </select>
                    </div>
                </div>
            </div>

            <br/><br/>
            {errorMessage && <p className="has-text-danger">{errorMessage}</p>}
            <div className="scrollable-container">
                {filteredVisitRequests.length > 0 ? (
                    filteredVisitRequests.map((request) => (
                        <div
                            key={request.id}
                            className="box"
                            style={{
                                position: 'relative',
                                backgroundColor: getStatusColor(request.status)
                            }}
                        >
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
                            <p>
                                <strong>Message:</strong>{' '}
                                {request.message ||
                                    <span style={{fontStyle: 'italic', color: '#999'}}>No message provided</span>}
                            </p>
                            <p><strong>Requested Visit Date:</strong> {formatDate(request.visit_date)}</p>
                            <p><strong>Status:</strong> {request.status}</p>
                        </div>
                    ))
                ) : (
                    <p>No visit requests found.</p>
                )}
            </div>
        </div>
    );
};

export default UserVisitRequests;
