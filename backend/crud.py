from sqlalchemy.orm import Session
import models
import schemas
from passlib.context import CryptContext
from fastapi import HTTPException
from models import User, Property, Image, Favorite, VisitRequest, VisitRequestStatus
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- User CRUD operations ---
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(username=user.username,
                          hashed_password=hashed_password,
                          name=user.name,
                          surname=user.surname,
                          role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, username: str):
    db_user = db.query(models.User).filter(models.User.username == username).first()
    return db_user

def get_user_by_id(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    return db_user

def get_properties_by_user(db: Session, username: str):
    # Fetch the user based on the username
    user = get_user(db, username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Query properties owned by the agent
    return db.query(models.Property).filter(models.Property.agent_id == user.id).all()


def get_users(db: Session):
    users = db.query(models.User).all()
    if not users:
        return []
    return users


def update_user(db: Session, user_id: int, user_update: schemas.UserCreate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not db_user:
        return None

    db_user.username = user_update.username
    db_user.hashed_password = pwd_context.hash(user_update.password)
    db_user.name = user_update.name
    db_user.surname = user_update.surname
    db_user.role = user_update.role

    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not db_user:
        return None

    db.delete(db_user)
    db.commit()
    return True


# --- Property CRUD operations ---
def create_property(db: Session, property: schemas.PropertyCreate, agent_id: int):
    db_property = models.Property(
        title=property.title,
        description=property.description,
        price=property.price,
        location=property.location,
        property_type=property.property_type,
        bedrooms=property.bedrooms,
        bathrooms=property.bathrooms,
        size=property.size,
        agent_id=agent_id  # Associate the property with the agent
    )
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    return db_property


def get_property(db: Session, property_id: int):
    return db.query(models.Property).filter(models.Property.id == property_id).first()


def get_properties_by_agent(db: Session, agent_id: int):
    return db.query(models.Property).filter(models.Property.agent_id == agent_id).all()


def get_all_properties(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.Property).offset(skip).limit(limit).all()


def update_property(db: Session, property_id: int, property_update: schemas.PropertyCreate):
    db_property = db.query(models.Property).filter(models.Property.id == property_id).first()

    if not db_property:
        return None

    db_property.title = property_update.title
    db_property.description = property_update.description
    db_property.price = property_update.price
    db_property.location = property_update.location
    db_property.property_type = property_update.property_type
    db_property.bedrooms = property_update.bedrooms
    db_property.bathrooms = property_update.bathrooms
    db_property.size = property_update.size

    db.commit()
    db.refresh(db_property)
    return db_property


def delete_property(db: Session, property_id: int):
    db_property = db.query(models.Property).filter(models.Property.id == property_id).first()

    if not db_property:
        return None

    db.delete(db_property)
    db.commit()
    return True


def search_properties(
        db: Session,
        location: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        property_type: str | None = None,
        bedrooms: int | None = None,
        bathrooms: int | None = None
):

    return db.query(models.Property).filter(
        # Only add filters for non-None values
        models.Property.location.ilike(f"%{location}%") if location else True,
        models.Property.price >= min_price if min_price is not None else True,
        models.Property.price <= max_price if max_price is not None else True,
        models.Property.property_type == property_type if property_type else True,  # Use Enum
        models.Property.bedrooms >= bedrooms if bedrooms is not None else True,
        models.Property.bathrooms >= bathrooms if bathrooms is not None else True
    ).all()


# --- Image CRUD operations ---

def create_image(db: Session, image: schemas.ImageCreate, property_id: int):
    """
    Create a new image associated with a specific property.
    """
    db_image = models.Image(
        url=image.url,
        property_id=property_id
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


def get_image(db: Session, property_id: int, image_id: int):
    """
    Retrieve a single image by its ID and associated property_id.
    """
    return db.query(models.Image).filter(
        models.Image.id == image_id,
        models.Image.property_id == property_id
    ).first()
def get_images_by_property(db: Session, property_id: int):
    """
    Retrieve all images associated with a specific property.
    """
    return db.query(models.Image).filter(models.Image.property_id == property_id).all()


def delete_image(db: Session, image_id: int):
    """
    Delete an image by its ID.
    """
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()

    if not db_image:
        return None

    db.delete(db_image)
    db.commit()
    return True

# --- Favorite CRUD operations ---
def add_favorite(db: Session, user_id: int, property_id: int):
    favorite = models.Favorite(user_id=user_id, property_id=property_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite

def remove_favorite(db: Session, user_id: int, property_id: int):
    favorite = db.query(models.Favorite).filter_by(user_id=user_id, property_id=property_id).first()
    if favorite:
        db.delete(favorite)
        db.commit()
        return True
    raise HTTPException(status_code=404, detail="Favorite not found")

def get_favorites(db: Session, user_id: int):
    return db.query(models.Property).join(models.Favorite).filter(models.Favorite.user_id == user_id).all()


def create_visit_request(db: Session, visit_request: schemas.VisitRequestCreate, user_id: int):
    db_visit_request = models.VisitRequest(
        property_id=visit_request.property_id,
        user_id=user_id,
        email=visit_request.email,
        message=visit_request.message,
        visit_date=visit_request.visit_date,  # Assuming visit_date is a datetime
        visit_time=visit_request.visit_time,  # Assuming visit_time is a datetime
        created_at=datetime.utcnow(),
        status=models.VisitRequestStatus.pending,  # Default status
    )
    db.add(db_visit_request)
    db.commit()
    db.refresh(db_visit_request)
    return db_visit_request


def get_visit_requests_for_property(db: Session, property_id: int):
    return db.query(VisitRequest).filter(VisitRequest.property_id == property_id).all()



def get_visit_requests_for_agent(db: Session, agent_id: int):
    return (
        db.query(VisitRequest)
        .join(Property, Property.id == VisitRequest.property_id)
        .filter(Property.agent_id == agent_id)
        .all()
    )

def get_visit_requests_for_user(db: Session, user_id: int):
    return db.query(models.VisitRequest).filter(models.VisitRequest.user_id == user_id).all()
def update_visit_request_status(db: Session, request_id: int, status: VisitRequestStatus):
    visit_request = db.query(VisitRequest).filter(VisitRequest.id == request_id).first()
    if visit_request:
        visit_request.status = status
        db.commit()
        db.refresh(visit_request)
    return visit_request