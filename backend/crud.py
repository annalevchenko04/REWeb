from sqlalchemy.orm import Session
import models
import schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


def get_image(db: Session, image_id: int):
    """
    Retrieve a single image by its ID.
    """
    return db.query(models.Image).filter(models.Image.id == image_id).first()


def get_images_by_property(db: Session, property_id: int):
    """
    Retrieve all images associated with a specific property.
    """
    return db.query(models.Image).filter(models.Image.property_id == property_id).all()


def update_image(db: Session, image_id: int, image_update: schemas.ImageCreate):
    """
    Update the URL of an existing image.
    """
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()

    if not db_image:
        return None

    db_image.url = image_update.url

    db.commit()
    db.refresh(db_image)
    return db_image


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
