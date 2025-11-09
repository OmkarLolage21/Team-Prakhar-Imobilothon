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

@router.get("/", response_model=ProfileResponse,
    summary="Get user profile",
    response_description="Current user profile data",
)
async def get_profile():
    """
    Retrieve the authenticated user's profile.
    
    ## MVP Note
    
    Currently returns demo profile. Production implementation would:
    - Extract user_id from JWT token
    - Query user database
    - Include preferences, settings, and stats
    
    ## Profile Fields
    
    - **user_id**: Unique user identifier
    - **name**: Display name
    - **email**: Contact email (used for receipts)
    - **phone**: Optional phone number for SMS alerts
    """
    return ProfileResponse(**_profile_store)

@router.put("/", response_model=ProfileResponse,
    summary="Update user profile",
    response_description="Updated profile data",
)
async def update_profile(req: ProfileUpdateRequest):
    """
    Update user profile fields.
    
    Supports partial updates - only provided fields are modified.
    
    ## Updatable Fields
    
    - **name**: Change display name
    - **email**: Update contact email (triggers verification in production)
    - **phone**: Update phone for notifications
    
    ## Validation
    
    - Email must be valid format
    - Phone number format not enforced in MVP
    
    ## Future Enhancements
    
    - Email verification workflow
    - Password change
    - Notification preferences
    - Privacy settings
    """
    if req.name:
        _profile_store["name"] = req.name
    if req.email:
        _profile_store["email"] = req.email
    if req.phone:
        _profile_store["phone"] = req.phone
    return ProfileResponse(**_profile_store)
