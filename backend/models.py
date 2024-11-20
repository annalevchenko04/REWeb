from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from database import Base


# Enum for Property Types
class PropertyType(enum.Enum):
    house = "house"
    apartment = "apartment"


# Enum for Listing Status
class ListingStatus(enum.Enum):
    available = "available"
    sold = "sold"


# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    surname = Column(String)
    role = Column(String)

    # Relationship with property listings (one-to-many)
    properties = relationship("Property", back_populates="agent")

    # Relationship with favorite properties (one-to-many)
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")

    visit_requests = relationship("VisitRequest", back_populates="user", cascade="all, delete-orphan")

# Property model
class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    location = Column(String)
    property_type = Column(Enum(PropertyType), index=True)  # Use Python Enum
    bedrooms = Column(Integer)
    bathrooms = Column(Integer)
    size = Column(Float)
    status = Column(Enum(ListingStatus), default=ListingStatus.available)  # Use Python Enum
    created_at = Column(DateTime, server_default=func.now())

    agent_id = Column(Integer, ForeignKey("users.id"))
    agent = relationship("User", back_populates="properties")

    # Relationship with images (one-to-many)
    images = relationship("Image", back_populates="property", cascade="all, delete-orphan")

    # Relationship with favorites (one-to-many)
    favorites = relationship("Favorite", back_populates="property", cascade="all, delete-orphan")

    visit_requests = relationship("VisitRequest", back_populates="property", cascade="all, delete-orphan")

# Image model
class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String)
    upload_date = Column(DateTime, server_default=func.now())

    # Foreign key to associate with property
    property_id = Column(Integer, ForeignKey("properties.id"))

    # Relationship with the property (many-to-one)
    property = relationship("Property", back_populates="images")


# Favorite model
class Favorite(Base):
    __tablename__ = 'favorites'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    property_id = Column(Integer, ForeignKey('properties.id'), index=True)

    __table_args__ = (UniqueConstraint('user_id', 'property_id', name='unique_favorite'),)

    # Relationship with the user (many-to-one)
    user = relationship("User", back_populates="favorites")

    # Relationship with the property (many-to-one)
    property = relationship("Property", back_populates="favorites")


class VisitRequestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"

class VisitRequest(Base):
    __tablename__ = "visit_requests"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    visit_date = Column(DateTime, nullable=False)
    visit_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(VisitRequestStatus), default=VisitRequestStatus.pending)  # New status field

    # Relationships
    property = relationship("Property", back_populates="visit_requests")
    user = relationship("User", back_populates="visit_requests")