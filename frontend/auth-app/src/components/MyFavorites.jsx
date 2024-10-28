import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from "../context/UserContext";
import ErrorMessage from "./ErrorMessage";

const MyFavorites = () => {
    const [token] = useContext(UserContext);
    const [errorMessage, setErrorMessage] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        if (token) {
            getUserInfo(); // Fetch user info first
        }
    }, [token]);

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
            setUserId(data.id); // Set user ID for fetching favorites
            fetchFavorites(data.id); // Fetch the user's favorite properties
        } catch (error) {
            setErrorMessage("An error occurred while trying to fetch user information.");
        }
    };

    const fetchFavorites = async (userId) => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response = await fetch(`http://localhost:8000/users/${userId}/favorites`, requestOptions);

            if (!response.ok) {
                setErrorMessage("Something went wrong. Couldn't load favorite properties");
                return;
            }

            const data = await response.json();

            // Fetch images for each favorite property
            const favoritesWithImages = await Promise.all(data.map(async (property) => {
                const imagesResponse = await fetch(`http://localhost:8000/property/${property.id}/images`, requestOptions);
                const images = await imagesResponse.json();
                return { ...property, images };
            }));

            setFavorites(favoritesWithImages);
        } catch (error) {
            setErrorMessage("Failed to fetch favorite properties. Please try again later.");
        }
    };

    // Function to delete a favorite property
   // Function to delete a favorite property with a confirmation
const deleteFavorite = async (propertyId) => {
    // Ask for confirmation before deleting
    const isConfirmed = window.confirm("Are you sure you want to delete this from favorites?");

    if (!isConfirmed) {
        return; // If the user cancels, do nothing
    }

    const requestOptions = {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    };

    try {
        const response = await fetch(`http://localhost:8000/users/${userId}/property/${propertyId}/favorites`, requestOptions);
        if (!response.ok) {
            setErrorMessage("Failed to delete favorite property.");
            return;
        }

        // Remove the deleted property from the state
        setFavorites(favorites.filter((property) => property.id !== propertyId));
    } catch (error) {
        setErrorMessage("An error occurred while trying to delete the property.");
    }
};


    const buttonContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '20px 0',
    };

    const buttonStyle = {
        flex: 1,
        margin: '0 10px',
        textAlign: 'center',
    };

    return (
        <div className="container">
            <br/>
            <div style={buttonContainerStyle}>
                <Link to="/profile" className="button is-primary" style={buttonStyle}>
                    Back to Profile
                </Link>
                <Link to="/properties/search" className="button is-primary" style={buttonStyle}>
                    Go to Search
                </Link>
            </div>
            <br />
            <br />
            <h1 className="title is-3">My Favorite Properties</h1>
            {favorites.length > 0 ? (
                <div className="columns is-multiline">
                    {favorites.map((property) => (
                        <div className="column is-one-third" key={property.id}>
                            <div className="box favorite-card" style={{
                                position: 'relative',
                                height: '400px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}> {/* Flexbox for vertical alignment */}
                                <button
                                    onClick={() => deleteFavorite(property.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        backgroundColor: 'black',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '1.5rem',
                                        zIndex: 2,
                                    }}
                                >
                                    &times;
                                </button>

                                {property.images && property.images.length > 0 ? (
                                    <figure style={{
                                        width: '100%',
                                        height: '200px',
                                        overflow: 'hidden',
                                        margin: 0
                                    }}> {/* Image container */}
                                        <img
                                            src={`http://localhost:8000${property.images[0].url}`}
                                            alt={property.title}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                        />
                                    </figure>
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '200px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: '#f0f0f0',
                                        color: '#888',
                                    }}>
                                        No Image Available
                                    </div>
                                )}

                                <div style={{
                                    padding: '10px',
                                    flexGrow: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-start'
                                }}> {/* Flex-grow to occupy remaining space */}
                                    <h2 className="title is-5" style={{
                                        margin: '0',
                                        height: '50px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: 'block'
                                    }}>
                                        {property.title}
                                    </h2>
                                    <p className="subtitle is-6"><strong>€{property.price}</strong></p>
                                    <p style={{
                                        margin: '0',
                                        flexGrow: 1
                                    }}>{property.location}</p> {/* Allow this to grow and fill space */}
                                </div>

                                <Link to={`/property/${property.id}`} className="button is-primary is-fullwidth" style={{
                                marginTop: 'auto'  // This ensures that the button stays at the bottom
                                }}>
                                  View Details
                                </Link>
                            </div>
                        </div>


                    ))}
                </div>
            ) : (
                <p>No favorite properties found.</p>
            )}

            {errorMessage && <ErrorMessage message={errorMessage}/>}
        </div>
    );
};

export default MyFavorites;
