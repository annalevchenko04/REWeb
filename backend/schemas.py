from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime


# User creation model (used for creating a user)

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    surname: str
    role: str

    # Validator to check if username contains '@'
    @validator('username')
    def validate_username(cls, v):
        if '@' not in v:
            raise ValueError("Username must contain an '@' symbol.")
        return v

# User response model (used for reading user data)
class User(BaseModel):
    id: int
    username: str
    name: str
    surname: str
    role: str

    class Config:
        from_attributes = True


# Property creation model (used for creating a property)
class PropertyCreate(BaseModel):
    title: str
    description: str
    price: float
    location: str
    property_type: str  # 'house', 'apartment', etc.
    bedrooms: int
    bathrooms: int
    size: float


# Property response model (used for reading property data, includes images and agent info)
class Property(BaseModel):
    id: int
    title: str
    description: str
    price: float
    location: str
    property_type: str
    bedrooms: int
    bathrooms: int
    size: float
    status: str
    created_at: datetime
    agent: User  # Related agent information
    images: List["Image"] = []  # List of related images

    class Config:
        from_attributes = True

# Image creation model (used for uploading an image)
class ImageCreate(BaseModel):
    filename: str  # Original filename
    url: str


# Image response model (used for reading image data)
class Image(BaseModel):
    id: int
    url: str
    upload_date: datetime

    class Config:
        from_attributes = True

# To avoid circular imports, declare Property's images field after Image schema
Property.update_forward_refs()

class Favorite(BaseModel):
    id: int  # Unique identifier for the favorite entry
    user_id: int  # The ID of the user who favorited the property
    property_id: int  # The ID of the favorited property

    class Config:
        orm_mode = True



