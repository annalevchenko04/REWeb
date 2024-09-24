from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

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


# New Property Listing model
class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    location = Column(String)
    property_type = Column(Enum("house", "apartment", name="property_type"), index=True)
    bedrooms = Column(Integer)
    bathrooms = Column(Integer)
    size = Column(Float)
    status = Column(Enum("available", "sold", name="listing_status"), default="available")
    created_at = Column(DateTime, server_default=func.now())

    # Foreign key to associate with User (agent)
    agent_id = Column(Integer, ForeignKey("users.id"))

    # Relationship with the agent (many-to-one)
    agent = relationship("User", back_populates="properties")

    # Relationship with images (one-to-many)
    images = relationship("Image", back_populates="property")


# New Image model
class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String)  # Assuming you're storing image URL or file path
    upload_date = Column(DateTime, server_default=func.now())

    # Foreign key to associate with property
    property_id = Column(Integer, ForeignKey("properties.id"))

    # Relationship with the property (many-to-one)
    property = relationship("Property", back_populates="images")