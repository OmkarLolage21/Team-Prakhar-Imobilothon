from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.security import create_jwt

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Prototype: simple in-memory password check (NEVER for production)
_FAKE_USERS = {"demo@user.com": {"password": "demo", "role": "driver"}}

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = _FAKE_USERS.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(subject=req.email, role=user["role"])
    return LoginResponse(access_token=token)
