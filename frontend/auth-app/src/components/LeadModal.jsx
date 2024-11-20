import React, { useEffect, useState } from "react";

const LeadModal = ({ active, handleModal, token, id, setErrorMessage, userInfo }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [filteredCities, setFilteredCities] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [propertyType, setPropertyType] = useState(""); // 'house' or 'apartment'
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [size, setSize] = useState("");
  const [images, setImages] = useState([]); // State for image
  const [validationError, setValidationError] = useState("");
  const [existingImages, setExistingImages] = useState([]); // Existing images for update scenario
  const cities = [
  'Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Alytus', 'Marijampolė',
  'Jonava', 'Kėdainiai', 'Telšiai', 'Palanga', 'Visaginas'
  // Add more Lithuanian cities as needed
];
  const isValidCity = (city) => cities.includes(city);
  // Fetch property data if the modal is for updating (i.e., when id is present)
  useEffect(() => {
    const getProperty = async () => {
      const requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      };
      const response = await fetch(`http://localhost:8000/property/${id}/`, requestOptions);

      if (!response.ok) {
        setErrorMessage("Could not get the property");
      } else {
        const data = await response.json();
        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price);
        setLocation(data.location);
        setPropertyType(data.property_type);
        setBedrooms(data.bedrooms);
        setBathrooms(data.bathrooms);
        setSize(data.size);
        setExistingImages(data.images || []);
        setImages([]);
      }
    };

    if (id) {
      getProperty();
    } else {
      cleanFormData(); // Reset form fields when creating a new property
    }
  }, [id, token, setErrorMessage]);

  const cleanFormData = () => {
    setTitle("");
    setDescription("");
    setPrice(0);
    setLocation("");
    setPropertyType("");
    setBedrooms(0);
    setBathrooms(0);
    setSize(0);
    setImages([]);
    setExistingImages([]);
    setValidationError("");
  };

 // Function to handle removing newly selected images
  const handleRemoveNewImage = (indexToRemove) => {
    setImages((prevImages) => prevImages.filter((_, index) => index !== indexToRemove));
  };

  // Function to handle removing existing images
const handleRemoveExistingImage = async (imageId) => {
  try {
    const response = await fetch(`http://localhost:8000/users/${userInfo.id}/property/${id}/image/${imageId}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + token,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Remove the image from the state after successful deletion
    setExistingImages(existingImages.filter((image) => image.id !== imageId));
  } catch (error) {
    console.error("Error removing image:", error);
  }
};

  // Validation Function
  const validateForm = () => {
    if (price <= 0) return "Price must be greater than zero.";
    if (bedrooms <= 0) return "Number of bedrooms must be greater than zero.";
    if (bathrooms <= 0) return "Number of bathrooms must be greater than zero.";
    if (size <= 0) return "Size must be greater than zero.";
    if (!propertyType) return "Property type is required.";
    if (!title) return "Title is required.";
    if (!location) return "Location is required.";
    if (!isValidCity(location)) return "Please select a valid city from the list.";
    return "";
  };


  // Function to upload multiple images to the server
 const uploadImages = async (files, userId, propertyId) => {
  const uploadPromises = files.map(file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64data = reader.result;  // Base64 data
        try {
          const formData = new FormData();
          formData.append("image_data", base64data);  // Send base64 as form data

          const response = await fetch(`http://localhost:8000/users/${userId}/property/${propertyId}/image`, {
            method: 'POST',
            headers: {
              Authorization: "Bearer " + token,
            },
            body: formData,  // Use FormData for the request body
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const imageResponse = await response.json();
          resolve(imageResponse);
        } catch (error) {
          reject(error);
        }
      };

      reader.readAsDataURL(file);
    });
  });

  return Promise.all(uploadPromises);
};

  const handleCreateProperty = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    // Create property data without the image first
    const propertyData = {
      title,
      description,
      price,
      location,
      property_type: propertyType,
      bedrooms,
      bathrooms,
      size,
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(propertyData),
    };

    try {
      // Send property data first to create the property
      const response = await fetch(`http://localhost:8000/users/${userInfo.id}/property`, requestOptions);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error details:", errorData);
        setErrorMessage("Something went wrong when creating the property");
        return;
      }

      const createdProperty = await response.json();
      const propertyId = createdProperty.id; // Get the ID of the created property

      // Now upload the image if one is selected
       if (images.length > 0) {
        await uploadImages(images, userInfo.id, propertyId); // Upload multiple images
      }

      cleanFormData();
      handleModal();
    } catch (error) {
      setErrorMessage("An error occurred while creating the property.");
      console.error("Fetch error:", error);
    }
  };

   const handleUpdateProperty = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    const propertyData = {
      title,
      description,
      price,
      location,
      property_type: propertyType,
      bedrooms,
      bathrooms,
      size,
    };

    const requestOptions = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(propertyData),
    };

    try {
      // Send property data first to update the property
      const response = await fetch(`http://localhost:8000/users/${userInfo.id}/property/${id}`, requestOptions);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error details:", errorData);
        setErrorMessage("Something went wrong when updating the property");
        return;
      }

      // Now upload the images if any are selected
      if (images.length > 0) {
        await uploadImages(images, userInfo.id, id); // Upload multiple images
      }

      cleanFormData();
      handleModal();
    } catch (error) {
      setErrorMessage("An error occurred while updating the property.");
      console.error("Fetch error:", error);
    }
  };
const handleInvalid = (e) => {
    e.preventDefault();
    const inputName = e.target.name;
    let errorMessage = "";

    switch (inputName) {
      case "title":
        errorMessage = "Title is required.";
        break;
      case "price":
        errorMessage = "Price is required and must be greater than zero.";
        break;
      case "location":
        errorMessage = "Location is required.";
        break;
      case "bedrooms":
        errorMessage = "Number of bedrooms is required and must be greater than zero.";
        break;
      case "bathrooms":
        errorMessage = "Number of bathrooms is required and must be greater than zero.";
        break;
      case "size":
        errorMessage = "Size is required and must be greater than zero.";
        break;
      case "property_type":
        errorMessage = "Property type is required.";
        break;
      default:
        errorMessage = "This field is required.";
    }

    setValidationError(errorMessage);
  };

 const handleLocationChange = (e) => {
    const searchQuery = e.target.value;
    setLocation(searchQuery);

    if (searchQuery.length > 0) {
      const filtered = cities.filter(city =>
        city.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cities); // Show all cities if the input is empty
    }
  };
const handleCitySelect = (city, e) => {
  e.stopPropagation(); // Prevent the modal from closing
  setLocation(city);
  setFilteredCities([]); // Hide the list once a city is selected
};

  const handleFocus = () => {
    setIsFocused(true);
    // Show all cities when the input field is focused
    if (location === '') {
      setFilteredCities(cities);
    }
  };
  const handleBlur = () => {
  // Only close if focus was lost and no city was selected
  setTimeout(() => {
    if (!isFocused) {
      setFilteredCities([]); // Hide suggestions after a brief delay
    }
  }, 100);
};


  return (
    <div className={`modal ${active && "is-active"}`}>
      <div className="modal-background" onClick={handleModal}></div>
      <div className="modal-card">
        <header className="modal-card-head has-background-primary-light">
          <h1 className="modal-card-title">{id ? "Update Property" : "Create Property"}</h1>
        </header>
        <section className="modal-card-body">
          <form onSubmit={id ? handleUpdateProperty : handleCreateProperty}>
            <div className="field">
              <label className="label">Title <span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <input
                    type="text"
                    placeholder="Enter property title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    required
                    onInvalid={handleInvalid}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Description </label>
              <div className="control">
                <textarea
                    placeholder="Enter property description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea"
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Price (€)<span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <input
                    type="number"
                    placeholder="Enter property price"
                    value={price}  // Value is an empty string until the user types a number
                    onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}  // Only set number if input is not empty
                    className="input"
                    required
                    onInvalid={handleInvalid}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Location <span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <input
                    type="text"
                    placeholder="Enter property location"
                    value={location}
                    onChange={handleLocationChange}
                    onFocus={handleFocus} // Handle focus to show all cities
                    onBlur={handleBlur} // Handle blur if you want to hide suggestions
                    className="input"
                    required
                />
                {isFocused && filteredCities.length > 0 && (
                    <ul className="suggestions">
                      {filteredCities.map((city, index) => (
                        <li key={index} onClick={(e) => handleCitySelect(city, e)}>
                          {city}
                        </li>
                      ))}
                    </ul>
                )}
              </div>
            </div>
            <div className="field">
              <label className="label">Property Type<span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <div className="radio">
                  <input
                      type="radio"
                      name="property_type"
                      value="apartment"
                      checked={propertyType === "apartment"}
                      onChange={(e) => setPropertyType(e.target.value)}
                      required
                      onInvalid={handleInvalid}
                  />
                  <span>Apartment</span>
                </div>
                <br/>
                <div className="radio">
                  <input
                      type="radio"
                      name="property_type"
                      value="house"
                      checked={propertyType === "house"}
                      onChange={(e) => setPropertyType(e.target.value)}
                      required
                      onInvalid={handleInvalid}
                  />
                  <span>House</span>
                </div>
              </div>
            </div>
            <div className="field">
              <label className="label">Bedrooms <span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <input
                    type="number"
                    placeholder="Enter number of bedrooms"
                    value={bedrooms}  // Value is an empty string until the user types a number
                    onChange={(e) => setBedrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input"
                    required
                    onInvalid={handleInvalid}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Bathrooms <span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <input
                    type="number"
                    placeholder="Enter number of bathrooms"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input"
                    required
                    onInvalid={handleInvalid}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Size (m²) <span style={{color: 'red'}}>*</span></label>
              <div className="control">
                <input
                    type="number"
                    placeholder="Enter property size"
                    value={size}
                    onChange={(e) => setSize(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input"
                    required
                    onInvalid={handleInvalid}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Image</label>
              <div className="control">
                <input
                    type="file"
                    className="input"
                    onChange={(e) => setImages(Array.from(e.target.files))}
                    multiple
                />
              </div>
            </div>
            {/* Newly Selected Images */}
            {images.length > 0 && (
                <div className="field">
                  <p>Selected Images:</p>
                  <ul>
                    {images.map((image, index) => (
                        <li key={index} style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                          <img
                              src={URL.createObjectURL(image)}  // Use URL.createObjectURL for local file reference
                              alt={`Selected ${index}`}
                              width="100"
                              style={{marginRight: '10px'}}  // Add space between image and button
                          />
                          <span>{image.name}</span>
                          <button
                              className="button is-danger is-light is-small"
                              style={{width: '30px', height: '30px', padding: '5px', marginLeft: '10px'}}
                              onClick={() => handleRemoveNewImage(index)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </li>
                    ))}
                  </ul>
                </div>
            )}
            {/* Existing Images */}
            {existingImages.length > 0 && (
                <div className="field">
                  <p>Existing Images:</p>
                  <ul>
                    {existingImages.map((image) => (
                        <li key={image.id} style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                          <img
                              src={`http://localhost:8000/${image.url}`}
                              alt={`image_id ${image.id}`}
                              width="100"
                              style={{marginRight: '10px'}} // Space between image and button
                          />
                          <span style={{flex: 1}}>{`Image ID: ${image.id}`}</span> {/* Show image ID for clarity */}
                          <button
                              className="button is-danger is-light is-small"
                              style={{
                                width: '30px',
                                height: '30px',
                                padding: '5px',
                                marginLeft: '10px'
                              }} // Space between span and button
                              onClick={() => handleRemoveExistingImage(image.id)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </li>
                    ))}
                  </ul>
                </div>
            )}
            {validationError && (
                <p className="help is-danger">{validationError}</p>
            )}
          </form>
        </section>
        <footer className="modal-card-foot has-background-primary-light">
          {id ? (
              <button className="button is-primary" onClick={handleUpdateProperty}>
                Update
              </button>
          ) : (
              <button className="button is-primary" onClick={handleCreateProperty}>
                Create
              </button>
          )}
          <button className="button ml-2" onClick={handleModal}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LeadModal;
