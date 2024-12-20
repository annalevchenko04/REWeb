import os
import base64
import shutil
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi import Body
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated, List
from fastapi.staticfiles import StaticFiles
import crud
import models
import schemas
from models import VisitRequest
from database import engine, SessionLocal

# Initializing FastAPI application
app = FastAPI()

app.mount("/images", StaticFiles(directory="images"), name="images")

# Create a directory to store uploaded images if it doesn't exist
os.makedirs("images", exist_ok=True)

# OAuth2 setup for security, handles token authentication
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

# Passwords are hashed using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ALGORITHM HS256 refers to HMAC using SHA-256, a secure algorithm for signing and verifying JWT tokens.
# SECRET_KEY is used as the key for encoding and decoding JWT tokens.
# JWT configuration
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_MINUTES = 10

# Dependency annotation for database session
db_dependency = Annotated[Session, Depends(get_db)]


# User Registration Endpoint
@app.post("/register", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: db_dependency):
    db_user = crud.get_user(db=db, username=user.username)  # check if the user already exists in the database
    if db_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return crud.create_user(db=db, user=user)


#  checks if the user exists in the database and verifies the password
def authenticate_user(username: str, password: str, db: db_dependency):
    user = crud.get_user(db=db, username=username)
    if not user or not pwd_context.verify(password, user.hashed_password):
        return False
    return user


# If the credentials are valid, an access token is created
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=30))
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.middleware("http")
async def refresh_access_on_activity(request: Request, call_next):
    token = request.headers.get("Authorization")
    if token:
        token = token.split(" ")[1]  # remove 'Bearer' prefix
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                request.state.user = username
                new_access_token = create_access_token(
                    data={"sub": username},
                    expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                )
                response = await call_next(request)
                response.headers["x-new-access-token"] = new_access_token
                return response
        except JWTError:
            pass

    return await call_next(request)



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
    access_token = create_access_token(data={"sub": user.username},
                                       expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

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
async def verify_user_token(token: str, db: Session = Depends(get_db)):
    payload = verify_token(token=token)
    username = payload.get("sub")
    user = crud.get_user(db, username=username)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    #new_token = create_access_token({"sub": username}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    return {
        "message": "Token is valid",
        "role": user.role,
        "user_id": user.id,
        "name": user.name,
        "access_token": token
    }

# --- User Endpoints ---

# Read a user info anyone
@app.get("/users/{username}", response_model=schemas.User)
async def read_user(username: str, db: Session = Depends(get_db)):
    db_user = crud.get_user(db=db, username=username)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/users/id/{user_id}", response_model=schemas.User)
async def read_user_by_id(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_id(db=db, user_id=user_id)  # Add a function to get user by ID
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


# List all users
@app.get("/users", response_model=List[schemas.User])
async def list_users(db: db_dependency):
    users = crud.get_users(db=db)
    return users


# Read own user info
@app.get("/user/myinfo", response_model=schemas.User)
async def get_user_info(
        db: Session = Depends(get_db),
        token: str = Depends(oauth2_scheme)
):
    # Verify the token to extract user information
    payload = verify_token(token)
    username = payload.get("sub")  # Extract the username or user ID from the token

    # Fetch user information based on the username
    user = crud.get_user(db=db, username=username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# --- Property Endpoints ---

# Create a property (for agents)
@app.post("/users/{user_id}/property", response_model=schemas.Property)
async def create_property(
    user_id: int,
    property: schemas.PropertyCreate,
    db: db_dependency,
    token: str = Depends(oauth2_scheme)
):
    # Decode token and get user data
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Ensure the user exists, is an agent, and matches the user_id in the path
    if db_user is None or db_user.role != "agent" or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized or incorrect user ID")

    # Create the property with the agent's ID
    return crud.create_property(db=db, property=property, agent_id=db_user.id)


# Read a single property by ID
@app.get("/property/{property_id}", response_model=schemas.Property)
async def read_property(property_id: int, db: db_dependency):
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return db_property


# Get all properties
@app.get("/properties", response_model=List[schemas.Property])
async def list_properties(skip: int = 0, limit: int = 10, db: db_dependency = Annotated[Session, Depends(get_db)]):
    return crud.get_all_properties(db=db, skip=skip, limit=limit)


# Get all properties (for single user(agent))
@app.get("/users/{user_id}/myproperties", response_model=List[schemas.Property])
async def list_user_properties(
    user_id: int,  # user_id parameter from the URL (if you still want to keep this for some reason)
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Verify the token to extract user information
    payload = verify_token(token)
    username = payload.get("sub")  # Extract the username from the token

    # Fetch the user based on the username
    user = crud.get_user(db, username=username)  # Fetch user by username
    if not user:
        raise HTTPException(status_code=404, detail="User not found")


    if user.id != user_id:
        raise HTTPException(status_code=403, detail="User ID in the URL does not match the authenticated user")

    # Fetch properties for the authenticated user
    properties = crud.get_properties_by_user(db=db, username=username)  # Use username to fetch properties
    return properties



# Update a property (only for agents who own the property)
@app.put("/users/{user_id}/property/{property_id}", response_model=schemas.Property)
async def update_property(user_id: int, property_id: int, property: schemas.PropertyCreate, db: db_dependency,
                          token: str = Depends(oauth2_scheme)):
    # Verify token and get user info
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Verify user authorization
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this property")

    # Check if the property exists
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    # Ensure the user is authorized to update the specific property (admins or owners only)
    if db_user.role != "admin" and db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this property")

    # Update the property
    return crud.update_property(db=db, property_id=property_id, property_update=property)

@app.delete("/users/{user_id}/property/{property_id}", response_model=dict)
async def delete_property(
    user_id: int,
    property_id: int,
    db: db_dependency,
    token: str = Depends(oauth2_scheme)
):
    # Decode the token to get user information
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Ensure the authenticated user matches the user_id in the path
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Incorrect user ID")

    # Retrieve the property to check ownership
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    # Authorization: Only the property owner or an admin can delete the property
    if db_user.role != "admin" and db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this property")

    # Delete the property
    crud.delete_property(db=db, property_id=property_id)
    return {"message": "Property deleted successfully"}

#all the search parameters are defined as optional parameters (| None = None)
#If a user includes a parameter in the request URL , that parameter’s value is passed into the function.
#If a user leaves a parameter out, it defaults to None, meaning that the function will know it wasn’t provided and should ignore it.
@app.get("/properties/search",
         response_model=List[schemas.Property])
async def search_properties(
        location: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        property_type: str | None = None,
        bedrooms: int | None = None,
        bathrooms: int | None = None,
        db: Session = Depends(get_db)
):
    return crud.search_properties(
        db=db,
        location=location,
        min_price=min_price,
        max_price=max_price,
        property_type=property_type,
        bedrooms=bedrooms,
        bathrooms=bathrooms
    )

# --- Image Endpoints ---

# Upload an image for a property (only for agents who own the property)
@app.post("/users/{user_id}/property/{property_id}/image", response_model=schemas.Image)
async def upload_image(
    user_id: int,
    property_id: int,
    image_file: UploadFile = File(None),  # Allow file or base64
    image_data: str = Form(None),         # Allow base64 data as an alternative
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Ensure authenticated user matches user_id
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload images for this user")

    # Verify that property exists and user is authorized
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload images for this property")

    # Determine if image data is uploaded as a file or base64 string
    if image_file:
        # Handle file upload
        file_extension = image_file.filename.split(".")[-1]
        new_filename = f"{property_id}_{datetime.now().timestamp()}.{file_extension}"
        image_path = os.path.join("images", new_filename)
        with open(image_path, "wb") as file_io:
            content = await image_file.read()
            file_io.write(content)
    elif image_data:
        # Decode base64 and save
        file_extension = "png"  # Adjust extension as needed
        new_filename = f"{property_id}_{datetime.now().timestamp()}.{file_extension}"
        image_path = os.path.join("images", new_filename)
        with open(image_path, "wb") as file_io:
            image_bytes = base64.b64decode(image_data.split(",")[1])  # Ignore base64 header
            file_io.write(image_bytes)
    else:
        raise HTTPException(status_code=400, detail="No image data provided")

    # Record the image in the database
    image_data = schemas.ImageCreate(filename=new_filename, url=image_path)
    return crud.create_image(db=db, image=image_data, property_id=property_id)


@app.get("/property/{property_id}/image/{image_id}", response_model=schemas.Image)
async def read_image(property_id: int, image_id: int, db: db_dependency):
    db_image = crud.get_image(db=db, property_id=property_id, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found or does not belong to this property")
    return db_image  # Includes property_id in the response due to the Pydantic schema


# Get all images for a property
@app.get("/property/{property_id}/images", response_model=List[schemas.Image])
async def list_images_for_property(property_id: int, db: db_dependency):
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    images = crud.get_images_by_property(db=db, property_id=property_id)

    # Map the images to their accessible URLs
    for image in images:
        image.url = f"/images/{os.path.basename(image.url)}"  # Adjust the URL if necessary

    return images


# Delete an image by ID (only for agents who own the property)
@app.delete("/users/{user_id}/property/{property_id}/image/{image_id}", response_model=dict)
async def delete_image(user_id: int, property_id: int, image_id: int, db: db_dependency, token: str = Depends(oauth2_scheme)):
    # Verify token and retrieve user information
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Check if the user is authorized
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this image")

    # Retrieve the image by both image_id and property_id
    db_image = crud.get_image(db=db, property_id=property_id, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found or does not belong to the specified property")

    # Retrieve the property associated with this image
    db_property = crud.get_property(db=db, property_id=property_id)
    if db_property is None or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this image")

    # Perform the delete operation
    crud.delete_image(db=db, image_id=image_id)
    return {"message": "Image deleted successfully"}

# --- Favorite Endpoints ---

@app.post("/users/{user_id}/property/{property_id}/favorites", response_model=schemas.Favorite)
async def add_favorite(
    user_id: int,
    property_id: int,
    db: db_dependency = Annotated[Session, Depends(get_db)],
    token: str = Depends(oauth2_scheme)
):
    # Verify token and get user information
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Ensure the user ID from token matches the user_id in the path
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Incorrect user ID")

    # Add the property to favorites
    return crud.add_favorite(db, user_id, property_id)


# Remove a favorite property
@app.delete("/users/{user_id}/property/{property_id}/favorites")
async def remove_favorite(
    user_id: int,
    property_id: int,
    db: db_dependency = Annotated[Session, Depends(get_db)],
    token: str = Depends(oauth2_scheme)
):
    # Verify token and get user information
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Ensure the user ID from token matches the user_id in the path
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Incorrect user ID")

    # Remove the property from favorites
    crud.remove_favorite(db, user_id, property_id)
    return {"message": "Favorite removed successfully"}

# Get all favorite properties for a user
@app.get("/users/{user_id}/favorites", response_model=List[schemas.Property])
async def get_favorites(
    user_id: int,
    db: db_dependency = Annotated[Session, Depends(get_db)],
    token: str = Depends(oauth2_scheme)
):
    # Verify token and get user information
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Ensure the user ID from token matches the user_id in the path
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Incorrect user ID")

    # Retrieve all favorite properties for the user
    return crud.get_favorites(db, user_id)


# Endpoint to request a visit for a property
@app.post("/properties/{property_id}/visit-request", response_model=schemas.VisitRequestResponse)
async def create_visit_request(
    property_id: int,
    visit_request: schemas.VisitRequestCreate,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    if db_user is None:
        raise HTTPException(status_code=403, detail="Unauthorized: User not found")

    return crud.create_visit_request(db=db, visit_request=visit_request, user_id=db_user.id)


# Endpoint for an agent to list visit requests for their properties
@app.get("/users/{user_id}/properties/{property_id}/visit-requests", response_model=List[schemas.VisitRequestResponse])
async def list_visit_requests(
    user_id: int,
    property_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Verify and decode the token to get the user payload
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Check if the user is valid and authorized to access this endpoint
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid user or access forbidden")

    # Fetch the property and confirm the agent is indeed the owner
    db_property = crud.get_property(db, property_id=property_id)
    if not db_property or db_property.agent_id != db_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: Property access forbidden")

    # Fetch and return all visit requests for this property
    return crud.get_visit_requests_for_property(db=db, property_id=property_id)


# CRUD function to retrieve visit requests for a specific property
def get_visit_requests_for_property(db: Session, property_id: int):
    # Fetch and return all visit requests associated with the given property
    return db.query(VisitRequest).filter(VisitRequest.property_id == property_id).all()


@app.get("/users/{user_id}/visit-requests", response_model=List[schemas.VisitRequestResponse])
async def list_user_visit_requests(
    user_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Verify the token and fetch user info
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Check if the authenticated user matches the user_id in the URL
    if db_user is None or db_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Fetch the user's visit requests (across all properties)
    return crud.get_visit_requests_for_user(db=db, user_id=user_id)

@app.get("/users/{user_id}/agent-visit-requests", response_model=List[schemas.VisitRequestResponse])
async def list_agent_visit_requests(
    user_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Verify the user token
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    # Check if the authenticated user matches the user_id and has an agent role
    if db_user is None or db_user.id != user_id or db_user.role != "agent":
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Fetch all visit requests for properties owned by the agent
    visit_requests = crud.get_visit_requests_for_agent(db=db, agent_id=user_id)
    return visit_requests


# Endpoint for an agent to update the status of a visit request
@app.put("/visit-request/{request_id}/status", response_model=schemas.VisitRequestResponse)
async def update_visit_request_status(
    request_id: int,
    status: schemas.VisitRequestStatus,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    payload = verify_token(token)
    db_user = crud.get_user(db=db, username=payload.get("sub"))

    db_request = db.query(models.VisitRequest).filter(models.VisitRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Visit request not found")

    db_property = crud.get_property(db, property_id=db_request.property_id)
    if db_user is None or (db_user.role != "admin" and db_property.agent_id != db_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    return crud.update_visit_request_status(db, request_id, status)
