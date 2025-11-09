from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/profile", tags=["profile"])

# Simple in-memory demo profile (no auth yet)
_profile_store = {
    "user_id": "demo-user-1",
    "name": "Demo User",
    "email": "demo.user@example.com",
    "phone": "+911234567890",
}

class ProfileResponse(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

@router.get("/", response_model=ProfileResponse)
async def get_profile():
    return ProfileResponse(**_profile_store)

@router.put("/", response_model=ProfileResponse)
async def update_profile(req: ProfileUpdateRequest):
    if req.name:
        _profile_store["name"] = req.name
    if req.email:
        _profile_store["email"] = req.email
    if req.phone:
        _profile_store["phone"] = req.phone
    return ProfileResponse(**_profile_store)
