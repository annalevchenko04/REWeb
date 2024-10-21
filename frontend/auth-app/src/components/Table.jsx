import React, { useContext, useEffect, useState } from "react";
import ErrorMessage from "./ErrorMessage";
import LeadModal from "./LeadModal";
import { UserContext } from "../context/UserContext";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

const Table = () => {
    const [token] = useContext(UserContext);
    const [properties, setProperties] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [activeModal, setActiveModal] = useState(false);
    const [id, setId] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [sortBy, setSortBy] = useState('oldest'); // Initialize sortBy state
    const [users, setUsers] = useState([]); // New state for storing users
    const [usersLoaded, setUsersLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [deleteModal, setDeleteModal] = useState(false); // Track delete modal visibility
    const [userToDelete, setUserToDelete] = useState(null);

    useEffect(() => {
    if (token) {
        getUserInfo();
    }
    }, [token]);

    useEffect(() => {
        if (userInfo) {
            getProperties();
            if (userInfo.role === 'admin') {
                getAllUsers(); // Fetch users if the logged-in user is admin
            }
        }
    }, [userInfo]);


    const getUserInfo = async () => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response = await fetch(`http://localhost:8000/user/myinfo`, requestOptions);
            if (!response.ok) {
                setErrorMessage("Failed to fetch user information.");
                return;
            }
            const data = await response.json();
            setUserInfo(data);
        } catch (error) {
            setErrorMessage("An error occurred while trying to fetch user information.");
        }
    };

     const getAllUsers = async () => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response = await fetch(`http://localhost:8000/users`, requestOptions);
            if (!response.ok) {
                setErrorMessage("Failed to fetch user list.");
                return;
            }
            const data = await response.json();
            setUsers(data);
            setUsersLoaded(true);
        } catch (error) {
            setErrorMessage("An error occurred while trying to fetch the user list.");
        }
    };

    const handleUpdate = async (id) => {
        setId(id);
        setActiveModal(true);
    };

   const handleDelete = async (propertyId) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm("Are you sure you want to delete this property?");

    // If user cancels, exit the function
    if (!confirmDelete) {
        return;
    }

    const requestOptions = {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    };

    try {
        const response = await fetch(`http://localhost:8000/users/${userInfo.id}/property/${propertyId}`, requestOptions);
        if (!response.ok) {
            setErrorMessage("Failed to delete property");
            return;
        }

        setErrorMessage(""); // Clear error on success
        getProperties(); // Refresh property list after deletion
    } catch (error) {
        setErrorMessage("An error occurred while trying to delete the property.");
    }
};


       const getProperties = async () => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            // Use different endpoints for agents and admins
            const endpoint = userInfo?.role === 'admin' ? `http://localhost:8000/properties` : `http://localhost:8000/users/${userInfo.id}/myproperties`;
            const response = await fetch(endpoint, requestOptions);
            if (!response.ok) {
                setErrorMessage("Something went wrong. Couldn't load the properties");
                return;
            }
            const data = await response.json();

            // Fetch the images for each property
            const propertiesWithImages = await Promise.all(data.map(async (property) => {
                const imagesResponse = await fetch(`http://localhost:8000/property/${property.id}/images`, requestOptions);
                const images = await imagesResponse.json();
                return { ...property, images };
            }));

            if (Array.isArray(propertiesWithImages)) {
                setProperties(propertiesWithImages);
            } else {
                setProperties([]);
            }

            setLoaded(true);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage("Failed to fetch properties. Please try again later.");
        }
    };

    const handleModal = () => {
        setActiveModal(!activeModal);
        getProperties();
        setId(null);
    };

     // Function to sort properties
    const handleSort = (e) => {
        setSortBy(e.target.value);
        let sortedProperties;
        if (e.target.value === 'price_asc') {
            sortedProperties = [...properties].sort((a, b) => a.price - b.price);
        } else if (e.target.value === 'price_desc') {
            sortedProperties = [...properties].sort((a, b) => b.price - a.price);
        } else if (e.target.value === 'newest') {
            sortedProperties = [...properties].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
          else if (e.target.value === 'oldest') {
            sortedProperties = [...properties].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
        setProperties(sortedProperties);
    };

    // Filter users by search query
    const filteredUsers = users.filter((user) => {
        const matchesName = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.surname.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "" || user.role === roleFilter;
        return matchesName && matchesRole;
    });

const deleteUser = async (userId) => {
        const requestOptions = {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response = await fetch(`http://localhost:8000/users/${userId}`, requestOptions);
            if (!response.ok) {
                setErrorMessage("Failed to delete user.");
                return;
            }
            setUsers(users.filter((user) => user.id !== userId));
            setErrorMessage("");
        } catch (error) {
            setErrorMessage("An error occurred while trying to delete the user.");
        }
    };
    // Open delete confirmation modal
    const handleDeleteClick = (user) => {
        const confirmed = window.confirm(`Are you sure you want to delete ${user.name} ${user.surname}?`);
        if (confirmed) {
            deleteUser(user.id);
        }
    };


    return (
        <>
            <LeadModal
                active={activeModal}
                handleModal={handleModal}
                token={token}
                id={id}
                setErrorMessage={setErrorMessage}
                userInfo={userInfo}
            />

            {/* User Details Section */}
            {userInfo && (
                <div className="user-info">
                    <h2>Welcome, <strong>{userInfo.name} {userInfo.surname}</strong>!</h2>
                    <p><strong>Your Username:</strong> {userInfo.username}</p>
                    <p><strong>Your Role:</strong> {userInfo.role}</p>
                    <br/>
                </div>
            )}

            {/* Only render for admin */}
            {userInfo?.role === 'admin' && (
                <>
                    <h2 className="title is-4">All Users</h2>

                    {/* Role filter */}
                    <div className="field">
                        <label className="label">Sort by Role</label>
                        <div className="control">
                            <div className="select">
                                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                    <option value="">All Roles</option>
                                    <option value="admin">Admin</option>
                                    <option value="agent">Agent</option>
                                    <option value="user">User</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Search input */}
                    <div className="field">
                        <label className="label">Search by Name</label>
                        <div className="control">
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by name or surname..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    {usersLoaded ? (
                        <div className="table-container">
                        <table className="table is-fullwidth">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Surname</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <button
                                                    className="button is-danger is-light is-small" // Use Bulma's 'is-small' class for smaller buttons
                                                    style={{
                                                        width: '50px', // Adjust width to make it smaller
                                                        height: '40px', // Adjust height
                                                        padding: '5px', // Adjust padding for smaller buttons
                                                    }}
                                                    onClick={() => handleDeleteClick(user)}
                                                >
                                                    <i className="fas fa-trash-alt"></i> {/* Delete icon */}
                                                </button>
                                            </td>
                                            <td>{user.id}</td>
                                            <td>{user.name}</td>
                                            <td>{user.surname}</td>
                                            <td>{user.username}</td>
                                            <td>{user.role}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    ) : (
                        <p>Loading users...</p>
                    )}

                    {errorMessage && <ErrorMessage message={errorMessage} />}

                    <h2 className="title is-4">All Properties</h2>
                    {/* Sort By Dropdown */}
                    <div className="field">
                        <label className="label">Sort By</label>
                        <div className="control">
                            <div className="select">
                                <select value={sortBy} onChange={handleSort}>
                                    <option value="oldest">Oldest</option>
                                    <option value="newest">Newest</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {loaded ? (
                        properties && properties.length > 0 ? (
                            <div className="table-container">
                                <table className="table is-fullwidth">
                                    <thead>
                                    <tr>
                                        <th></th>
                                        <th>ID</th>
                                        <th>Agent</th>
                                        <th>Title</th>
                                        <th>Price(€)</th>
                                        <th>Location</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {properties.map((property) => (
                                        <tr key={property.id}>
                                            <td>
                                                {/*<button*/}
                                                {/*    className="button is-info is-light is-small"*/}
                                                {/*    style={{*/}
                                                {/*        width: '50px',*/}
                                                {/*        height: '40px',*/}
                                                {/*        marginBottom: '5px',*/}
                                                {/*        padding: '5px'*/}
                                                {/*    }}*/}
                                                {/*    onClick={() => handleUpdate(property.id)}*/}
                                                {/*>*/}
                                                {/*    <i className="fas fa-pencil-alt"></i>*/}
                                                {/*</button>*/}
                                                <button
                                                    className="button is-danger is-light is-small"
                                                    style={{width: '50px', height: '40px', padding: '5px'}}
                                                    onClick={() => handleDelete(property.id)}
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                            <td>{property.id}</td>

                                            <td>{property.agent?.username}</td>
                                            <td>
                                                <Link to={`/property/${property.id}`}
                                                      style={{textDecoration: 'underline', color: 'blue'}}>
                                                    {property.title}
                                                </Link>
                                            </td>

                                            <td>{property.price}</td>
                                            <td>{property.location}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p>No property listings found.</p>
                        )
                    ) : (
                        <p>Loading...</p>
                    )}

                </>
            )}
            {/* Only render for agents */}
            {(userInfo?.role === 'agent') && (
                <>
                    <button
                        className="button is-fullwidth mb-5 is-primary"
                        onClick={() => setActiveModal(true)}
                    >
                        + Add New Listing +
                    </button>

                    {/* Render properties table */}
                    {loaded ? (
                        properties && properties.length > 0 ? (
                            <div className="table-container"> {/* Added table-container for responsiveness */}
                                <table className="table is-fullwidth">
                                    <thead>
                                    <tr>
                                        <th></th>
                                        <th>ID</th>
                                        <th>Image</th>
                                        <th>Title</th>
                                        <th>Description</th>
                                        <th>Price(€)</th>
                                        <th>Location</th>
                                        <th>Type</th>
                                        <th>Bedrooms</th>
                                        <th>Bathrooms</th>
                                        <th>Size(m²)</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {properties.map((property) => (
                                        <tr key={property.id}>
                                            <td>
                                                <button
                                                    className="button is-info is-light is-small" // Use Bulma's 'is-small' class for smaller buttons
                                                    style={{
                                                        width: '50px', // Adjust width to make it smaller
                                                        height: '40px', // Adjust height
                                                        marginBottom: '5px', // Adjust margin if needed
                                                        padding: '5px', // Adjust padding for smaller buttons
                                                    }}
                                                    onClick={() => handleUpdate(property.id)}
                                                >
                                                    <i className="fas fa-pencil-alt"></i> {/* Update icon */}
                                                </button>
                                                <button
                                                    className="button is-danger is-light is-small"
                                                    style={{
                                                        width: '50px', // Adjust width to make it smaller
                                                        height: '40px', // Adjust height
                                                        padding: '5px', // Adjust padding for smaller buttons
                                                    }}
                                                    onClick={() => handleDelete(property.id)}
                                                >
                                                    <i className="fas fa-trash-alt"></i> {/* Delete icon */}
                                                </button>
                                            </td>
                                            <td>{property.id}</td>
                                            <td>
                                                {property.images && property.images.length > 0 ? (
                                                    property.images.map((image) => (
                                                        <img key={image.id} src={`http://localhost:8000${image.url}`}
                                                             alt="Property Image"
                                                             style={{width: '100px', height: 'auto'}}/>
                                                    ))
                                                ) : (
                                                    <span>No Image</span>
                                                )}
                                            </td>
                                            <td>
                                                <Link to={`/property/${property.id}`}
                                                      style={{textDecoration: 'underline', color: 'blue'}}>
                                                    {property.title}
                                                </Link>
                                            </td>
                                            <td style={{
                                                wordWrap: 'break-word',
                                                whiteSpace: 'normal',
                                                maxWidth: '200px'
                                            }}>
                                                {property.description}
                                            </td>
                                            <td>{property.price}</td>
                                            <td>{property.location}</td>
                                            <td>{property.property_type}</td>
                                            <td>{property.bedrooms}</td>
                                            <td>{property.bathrooms}</td>
                                            <td>{property.size}</td>


                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p>You have no property listings.</p>
                        )
                    ) : (
                        <p>Loading...</p>
                    )}
                </>
            )}
            {(userInfo?.role === 'agent' || userInfo?.role === 'user') && (
                    <div style={{
                        textAlign: "left",
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '20px'
                    }}>
                        <Link to="/my-favorites" className="button is-primary"
                              style={{ width: '48%', marginBottom: '10px' }}>
                            My Favorites
                        </Link>

                        <Link to="/properties/search" className="button is-primary"
                              style={{ width: '48%', marginBottom: '10px' }}>
                            Property Search
                        </Link>
                    </div>
            )}
        </>

    );
};

export default Table;
