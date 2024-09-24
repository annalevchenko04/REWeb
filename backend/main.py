import os
from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated, List

# Importing necessary modules
import crud
import models
import schemas
from database import engine, SessionLocal

# Initializing FastAPI application
app = FastAPI()

# OAuth2 setup for security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# CORS configuration
origins = [
    "http://localhost:3000",
    "https://yourfrontenddomain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Creating the database tables
models.Base.metadata.create_all(bind=engine)


# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Dependency annotation for database session
db_dependency = Annotated[Session, Depends(get_db)]


# User Registration Endpoint
@app.post("/register", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: db_dependency):
    db_user = crud.get_user(db=db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return crud.create_user(db=db, user=user)


# Authentication and Token Creation
def authenticate_user(username: str, password: str, db: db_dependency):
    user = crud.get_user(db=db, username=username)
    if not user or not pwd_context.verify(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# Login Endpoint
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


# Token Verification
def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid")


# User Token Verification Endpoint
@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    verify_token(token=token)
    return {"message": "Token is valid"}


# User CRUD Endpoints

# Read a user
@app.get("/users/{username}", response_model=schemas.User)
async def read_user(username: str, db: db_dependency):
    db_user = crud.get_user(db=db, username=username)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Update a user
@app.put("/users/{user_id}", response_model=schemas.User)
async def update_existing_user(user_id: int, user: schemas.UserCreate, db: db_dependency):
    db_user = crud.update_user(db, user_id, user)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Delete a user
@app.delete("/users/{user_id}", response_model=dict)
async def delete_user(user_id: int, db: db_dependency):
    result = crud.delete_user(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# --- Property Endpoints ---

# Create a property (for agents)
@app.post("/properties", response_model=schemas.Property)
async def create_property(property: schemas.PropertyCreate, db: db_dependency, token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    if db_user is None or db_user.role != "agent":
        raise HTTPException(status_code=403, detail="Only agents can create property listings")

    return crud.create_property(db=db, property=property, agent_id=db_user.id)


# Read a single property by ID
@app.get("/properties/{property_id}", response_model=schemas.Property)
async def read_property(property_id: int, db: db_dependency):
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return db_property


# Get all properties (for buyers)
@app.get("/properties", response_model=List[schemas.Property])
async def get_properties(skip: int = 0, limit: int = 10, db: db_dependency = Annotated[Session, Depends(get_db)]):
    return crud.get_all_properties(db=db, skip=skip, limit=limit)


# Update a property (only for agents who own the property)
@app.put("/properties/{property_id}", response_model=schemas.Property)
async def update_property(property_id: int, property: schemas.PropertyCreate, db: db_dependency,
                          token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    if db_user is None or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this property")

    return crud.update_property(db=db, property_id=property_id, property_update=property)


# Delete a property (only for agents who own the property)
@app.delete("/properties/{property_id}", response_model=dict)
async def delete_property(property_id: int, db: db_dependency, token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    if db_user is None or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this property")

    crud.delete_property(db=db, property_id=property_id)
    return {"message": "Property deleted successfully"}


# --- Image Endpoints ---

# Upload an image for a property (only for agents who own the property)
@app.post("/properties/{property_id}/images", response_model=schemas.Image)
async def upload_image(property_id: int, image: schemas.ImageCreate, db: db_dependency,
                       token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    if db_user is None or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload images for this property")

    return crud.create_image(db=db, image=image, property_id=property_id)


# Get all images for a property
@app.get("/properties/{property_id}/images", response_model=List[schemas.Image])
async def get_images_for_property(property_id: int, db: db_dependency):
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    return crud.get_images_by_property(db=db, property_id=property_id)


# Delete an image by ID (only for agents who own the property)
@app.delete("/images/{image_id}", response_model=dict)
async def delete_image(image_id: int, db: db_dependency, token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    db_image = crud.get_image(db=db, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")

    db_property = crud.get_property(db=db, property_id=db_image.property_id)
    if db_user is None or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this image")

    crud.delete_image(db=db, image_id=image_id)
    return {"message": "Image deleted successfully"}


@app.get("/api")
async def root():
    return {"message": "Hello World"}
