from fastapi import APIRouter, HTTPException, status
from app.database import users_collection
from app.schemas import UserRegister, UserLogin, AuthResponse
from app.auth_utils import hash_password, verify_password, create_access_token
from app.models import user_helper

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
def register(user_data: UserRegister):
    existing_user = users_collection.find_one({"email": user_data.email})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    new_user = {
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "is_active": True,
    }

    result = users_collection.insert_one(new_user)

    created_user = users_collection.find_one({"_id": result.inserted_id})
    user_response = user_helper(created_user)

    access_token = create_access_token(
        data={"sub": user_response["email"], "user_id": user_response["id"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }


@router.post("/login", response_model=AuthResponse)
def login(user_data: UserLogin):
    user = users_collection.find_one({"email": user_data.email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user_response = user_helper(user)

    access_token = create_access_token(
        data={"sub": user_response["email"], "user_id": user_response["id"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }