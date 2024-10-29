import React, { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from "../context/UserContext";
import ErrorMessage from "./ErrorMessage";

const PropertyDetails = () => {
    const [token] = useContext(UserContext);
    const [errorMessage, setErrorMessage] = useState("");
    const [property, setProperty] = useState({});
    const [isFavorited, setIsFavorited] = useState(false);
    let   [userId, setUserId] = useState(null);
    const [user, setUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); // Track modal visibility
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null); // Track selected image index
    const { property_id } = useParams();

    useEffect(() => {
        const fetchData = async () => {
            if (token && property_id) {
                try {
                    await getUserInfo();
                    await fetchProperty(property_id);
                    await checkIfFavorited(property_id);
                } catch (error) {
                    setErrorMessage(error.message || "Failed to load data.");
                } finally {
                    setIsLoading(false); // Set loading to false here
                }
            }
        };

        fetchData();
    }, [token, property_id]);
    const fetchProperty = async (property_id) => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response = await fetch(`http://localhost:8000/property/${property_id}`, requestOptions);
            if (!response.ok) {
                setErrorMessage("Something went wrong. Couldn't load the property");
                return;
            }

            const data = await response.json();
            const imagesResponse = await fetch(`http://localhost:8000/property/${property_id}/images`, requestOptions);
            const images = await imagesResponse.json();
            data.images = images;
            setProperty(data);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage("Failed to fetch property. Please try again later.");
        }
    };

    const checkIfFavorited = async (property_id) => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response1 = await fetch(`http://localhost:8000/user/myinfo`, requestOptions);
            const data = await response1.json();
            userId=data.id
            const response = await fetch(`http://localhost:8000/users/${userId}/favorites`, requestOptions);
            // Log the response to see its structure
            const favorites = await response.json();
            console.log(favorites); // Check the structure of the favorites response

            // Ensure favorites is an array before calling some
            if (Array.isArray(favorites)) {
                setIsFavorited(favorites.some(fav => String(fav.id) === property_id));
            } else {
                setErrorMessage("Failed to load favorites.");
            }
        } catch (error) {
            console.error("Failed to check favorites:", error);
        }
    };


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
            const data = await response.json();
            setUserId(data.id);
            setUser(data);
        } catch (error) {
            setErrorMessage("An error occurred while trying to fetch user information.");
        }
    };

    const toggleFavorite = async () => {
        const requestOptions = {
            method: isFavorited ? "DELETE" : "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        };

        try {
            const response = await fetch(`http://localhost:8000/users/${userId}/property/${property_id}/favorites`, requestOptions);
            if (!response.ok) throw new Error("Could not update favorites");
            setIsFavorited(!isFavorited);
        } catch (error) {
            console.error(error);
        }
    };


const formatDate = (dateString) => {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

    // Open modal with selected image index
    const handleImageClick = (index) => {
        setSelectedImageIndex(index);
        setIsModalOpen(true);
    };

    // Close the modal
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedImageIndex(null);
    };

    // Go to the previous image
    const goToPreviousImage = () => {
        if (selectedImageIndex > 0) {
            setSelectedImageIndex(selectedImageIndex - 1);
        }
    };

    // Go to the next image
    const goToNextImage = () => {
        if (selectedImageIndex < property.images.length - 1) {
            setSelectedImageIndex(selectedImageIndex + 1);
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
            <div style={{ textAlign: "left" }}>
                <br />
                <div style={buttonContainerStyle}>
                    <Link to="/profile" className="button is-primary" style={buttonStyle}>
                        Back to Profile
                    </Link>
                    <Link to="/properties/search" className="button is-primary" style={buttonStyle}>
                        Go to Search
                    </Link>
                </div>
            </div>
            <br/>
            {isLoading ? (
                <p>Loading property details...</p>
            ) :  property ? (
                <div className="box">
                    <div style={{textAlign: "right"}}>
                        {user && user.role !== 'admin' && (
                        <button
                            onClick={toggleFavorite}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            <span className="icon">
                                <i className={isFavorited ? "fas fa-heart" : "far fa-heart"}
                                   style={{color: isFavorited ? "red" : "gray"}}></i>
                            </span>
                        </button>
                        )}
                    </div>
                    <h1 className="title is-3">{property.title}</h1>
                    <p className="subtitle is-5"><strong>€{property.price}</strong></p>
                    <p style={{whiteSpace: 'normal', wordWrap: 'break-word', overflowWrap: 'break-word'}}>
                        {property.description}
                    </p>
                    <br/>

                    <h2 className="title is-4">Property Details</h2>
                    <p><strong>Location:</strong> {property.location}</p>
                    <p><strong>Type:</strong> {property.property_type}</p>
                    <p><strong>Bedrooms:</strong> {property.bedrooms}</p>
                    <p><strong>Bathrooms:</strong> {property.bathrooms}</p>
                    <p><strong>Size:</strong> {property.size} m²</p>
                    <p><strong>Status:</strong> {property.status}</p>
                    <br/>
                    <h2 className="title is-4">Images</h2>
                    <div className="columns is-multiline">
                        {property.images && property.images.length > 0 ? (
                            property.images.map((image, index) => (
                                <div className="column is-one-third" key={image.id}>
                                    <figure className="image is-4by3">
                                        <img
                                            src={`http://localhost:8000${image.url}`}
                                            alt={property.title}
                                            style={{objectFit: 'cover', cursor: 'pointer'}} // Add cursor pointer
                                            onClick={() => handleImageClick(index)} // Open modal on click
                                        />
                                    </figure>
                                    <p className="has-text-centered">
                                        <small>Uploaded on: {formatDate(image.upload_date)}</small>
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div style={{
                                width: '300px',
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
                    </div>

                    <h3 className="title is-4">Contact Agent</h3>
                    <p><strong>Name:</strong> {property.agent?.name} {property.agent?.surname}</p>
                    <p><strong>Email:</strong> {property.agent?.username}</p>
                    <p className="published-date" style={{textAlign: "right", marginTop: "10px"}}>
                        <strong>Published:</strong> {formatDate(property.created_at)}
                    </p>
                </div>
            ) : (
                <ErrorMessage message={errorMessage} />
            )}
            {/* Modal Component */}
            {isModalOpen && (
    <div className="modal is-active">
        <div className="modal-background" onClick={closeModal}></div>
        <div className="modal-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                {/* Back (Previous) Button */}
                {selectedImageIndex > 0 && (
                    <button
                        onClick={goToPreviousImage}
                        style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '24px',
                            padding: '10px',
                            zIndex: 1,
                        }}
                    >
                        ◀
                    </button>
                )}

                {/* Display Selected Image */}
                <figure className="image" style={{ textAlign: 'center' }}>
                    <img
                        src={`http://localhost:8000${property.images[selectedImageIndex].url}`}
                        alt="Selected"
                        style={{
                            objectFit: 'contain',
                            maxHeight: '90vh',
                            maxWidth: '90%',
                            margin: '0 auto',
                        }}
                    />
                </figure>

                {/* Next Button */}
                {selectedImageIndex < property.images.length - 1 && (
                    <button
                        onClick={goToNextImage}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '24px',
                            padding: '10px',
                            zIndex: 1,
                        }}
                    >
                        ▶
                    </button>
                )}
            </div>
        </div>
        <button className="modal-close is-large" aria-label="close" onClick={closeModal}></button>
    </div>
)}

        </div>
    );
};

export default PropertyDetails;
