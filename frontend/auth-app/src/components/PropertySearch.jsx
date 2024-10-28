import React, { useContext, useState } from 'react';
import { UserContext } from "../context/UserContext";
import ErrorMessage from "./ErrorMessage";
import { Link, useNavigate } from "react-router-dom";

const PropertySearch = () => {
    const [token] = useContext(UserContext);
    const [errorMessage, setErrorMessage] = useState("");
    const [location, setLocation] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [bathrooms, setBathrooms] = useState('');
    const [properties, setProperties] = useState([]);
    const [showSearchForm, setShowSearchForm] = useState(true);
    const [sortBy, setSortBy] = useState('oldest'); // Initialize sortBy state
    const navigate = useNavigate();

    const handleSearch = async (e) => {
    e.preventDefault();

    if (!location) {
        setErrorMessage("Location is required.");
        return;
    }
    if (!propertyType) {
        setErrorMessage("Property Type is required.");
        return;
    }

    // Build query string dynamically
    const queryParams = new URLSearchParams();

    if (location) queryParams.append('location', location);
    if (minPrice) queryParams.append('min_price', minPrice);
    if (maxPrice) queryParams.append('max_price', maxPrice);
    if (propertyType) queryParams.append('property_type', propertyType);
    if (bedrooms) queryParams.append('bedrooms', bedrooms);
    if (bathrooms) queryParams.append('bathrooms', bathrooms);

    const searchUrl = `/properties/search?${queryParams.toString()}`;

    // Update the URL with query parameters in the client-side router
    navigate(searchUrl);

    const requestOptions = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    };

    try {
        const response = await fetch(`http://localhost:8000${searchUrl}`, requestOptions);
        if (!response.ok) {
            setErrorMessage("Something went wrong. Couldn't load the properties");
            return;
        }
        const data = await response.json();

        // Fetch images for each property
        const propertiesWithImages = await Promise.all(data.map(async (property) => {
            const imagesResponse = await fetch(`http://localhost:8000/property/${property.id}/images`, requestOptions);
            const images = await imagesResponse.json();
            return { ...property, images }; // Include images in the property object
        }));

        if (Array.isArray(propertiesWithImages)) {
            setProperties(propertiesWithImages);
            setShowSearchForm(false); // Hide the form when search is successful
        } else {
            setProperties([]);
        }
        setErrorMessage("");
    } catch (error) {
        setErrorMessage("Failed to fetch properties. Please try again later.");
    }
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

    // Function to reset the form and show the search form again
    const handleNewSearch = () => {
        setProperties([]);   // Clear previous results
        setShowSearchForm(true); // Show the search form again

        // Reset the search inputs
        setLocation('');
        setMinPrice('');
        setMaxPrice('');
        setPropertyType('');
        setBedrooms('');
        setBathrooms('');

        // Navigate back to the search page (this is optional based on UX design)
        navigate('/properties/search');
    };

    return (
        <div className="container">
            <Link to="/profile" className="button is-primary">
                Back to Profile
            </Link>
            <br />
            <br />
            {/* Conditional rendering of the search title */}
            {showSearchForm && <h1 className="title">Search Properties</h1>}
            <ErrorMessage message={errorMessage} />

            {/* Conditional rendering for the search form */}
            {showSearchForm ? (
                <form onSubmit={handleSearch} className="box">
                    <div className="field">
                        <label className="label">Location <span style={{ color: 'red' }}>*</span></label>
                        <div className="control">
                            <input
                                className="input"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Location"
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Min Price</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                placeholder="Min Price"
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Max Price</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder="Max Price"
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Property Type <span style={{ color: 'red' }}>*</span></label>
                        <div className="control">
                            <div className="select">
                                <select
                                    value={propertyType}
                                    onChange={(e) => setPropertyType(e.target.value)}
                                >
                                    <option value="">Select Property Type</option>
                                    <option value="house">House</option>
                                    <option value="apartment">Apartment</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Bedrooms</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                value={bedrooms}
                                onChange={(e) => setBedrooms(e.target.value)}
                                placeholder="Bedrooms"
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Bathrooms</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                value={bathrooms}
                                onChange={(e) => setBathrooms(e.target.value)}
                                placeholder="Bathrooms"
                            />
                        </div>
                    </div>

                    <div className="control">
                        <button type="submit" className="button is-primary">
                            <i className="fas fa-search"></i> {/* Font Awesome Search Icon */}
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <h1 className="title">Results</h1>
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

                    {/* Properties Display */}
                    {properties.length > 0 ? (
                        <div className="columns is-multiline">
                            {properties.map((property) => (
                                <div className="column is-one-third" key={property.id}>
                                    <div className="box favorite-card" style={{
                                    position: 'relative',
                                    height: '400px',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}> {/* Flexbox for vertical alignment */}
                                        {/* Check for property images */}
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
                        <p>No properties found.</p>
                    )}

                    <br/>
                    <button className="button is-primary" onClick={handleNewSearch}>
                        Back to Search
                    </button>
                </>
            )}
        </div>
    );
};

export default PropertySearch;
