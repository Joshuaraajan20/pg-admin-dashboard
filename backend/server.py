from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import bcrypt
import jwt
from io import BytesIO
import csv
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'pg-manager-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="PG Manager Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ======================== ENUMS ========================

class UserRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    MAINTENANCE = "maintenance"

class RoomType(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    TRIPLE = "triple"

class RoomStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"

class ResidentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"

class PaymentStatus(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"

class ComplaintStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class ComplaintCategory(str, Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    FURNITURE = "furniture"
    CLEANING = "cleaning"
    AC_COOLER = "ac_cooler"
    INTERNET = "internet"
    OTHER = "other"

class StaffRole(str, Enum):
    WARDEN = "warden"
    CLEANER = "cleaner"
    COOK = "cook"
    MAINTENANCE = "maintenance"

class StaffStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class NoticePriority(str, Enum):
    NORMAL = "normal"
    IMPORTANT = "important"

# ======================== MODELS ========================

# User/Auth Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.OWNER

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Property Models
class PropertyBase(BaseModel):
    name: str
    address: str
    city: str
    state: str
    pincode: str
    total_floors: int
    amenities: List[str] = []

class PropertyCreate(PropertyBase):
    pass

class Property(PropertyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    owner_id: str = ""

# Room Models
class BedInfo(BaseModel):
    bed_number: int
    is_occupied: bool = False
    resident_id: Optional[str] = None

class RoomBase(BaseModel):
    room_number: str
    room_type: RoomType
    number_of_beds: int
    rent_amount: float
    security_deposit: float
    status: RoomStatus = RoomStatus.AVAILABLE
    floor: int = 1

class RoomCreate(RoomBase):
    property_id: str

class Room(RoomBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    beds: List[BedInfo] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Resident Models
class ResidentBase(BaseModel):
    name: str
    phone: str
    email: EmailStr
    emergency_contact: str
    check_in_date: datetime
    contract_end_date: datetime
    deposit_paid: float
    status: ResidentStatus = ResidentStatus.ACTIVE

class ResidentCreate(ResidentBase):
    property_id: str
    room_id: str
    bed_number: int

class Resident(ResidentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    room_id: str
    bed_number: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ResidentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    emergency_contact: Optional[str] = None
    contract_end_date: Optional[datetime] = None
    status: Optional[ResidentStatus] = None
    room_id: Optional[str] = None
    bed_number: Optional[int] = None

# Payment Models
class PaymentBase(BaseModel):
    resident_id: str
    invoice_month: str  # Format: YYYY-MM
    base_rent: float
    electricity_charge: float = 0
    food_charge: float = 0
    maintenance_charge: float = 0
    due_date: datetime

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_amount: float = 0
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[str] = None
    payment_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    payment_method: Optional[str] = None
    payment_date: Optional[datetime] = None

# Complaint Models
class ComplaintBase(BaseModel):
    resident_id: str
    room_id: str
    category: ComplaintCategory
    description: str
    photo_url: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    pass

class Complaint(ComplaintBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ComplaintStatus = ComplaintStatus.OPEN
    assigned_staff_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class ComplaintUpdate(BaseModel):
    status: Optional[ComplaintStatus] = None
    assigned_staff_id: Optional[str] = None

# Staff Models
class StaffBase(BaseModel):
    name: str
    phone: str
    role: StaffRole
    salary: float
    status: StaffStatus = StaffStatus.ACTIVE

class StaffCreate(StaffBase):
    assigned_property_id: str

class Staff(StaffBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_property_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Notice Models
class NoticeBase(BaseModel):
    title: str
    description: str
    target: str = "all"  # "all" or comma-separated room IDs
    priority: NoticePriority = NoticePriority.NORMAL

class NoticeCreate(NoticeBase):
    pass

class Notice(NoticeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""

# Settings Models
class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    rent_due_day: int = 5
    late_fee_percentage: float = 5.0
    notice_period_days: int = 30
    refund_policy: str = "Security deposit refundable after 30 days notice"
    rental_agreement_template: Optional[str] = None

# Dashboard Models
class DashboardStats(BaseModel):
    total_properties: int
    total_rooms: int
    occupied_rooms: int
    vacant_rooms: int
    total_residents: int
    pending_dues: float
    monthly_revenue: float

# ======================== AUTH HELPERS ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ======================== AUTH ENDPOINTS ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"]
    )

# ======================== PROPERTY ENDPOINTS ========================

@api_router.get("/properties", response_model=List[Property])
async def get_properties(current_user: dict = Depends(get_current_user)):
    properties = await db.properties.find({}, {"_id": 0}).to_list(1000)
    return properties

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop

@api_router.post("/properties", response_model=Property)
async def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    prop = Property(**property_data.model_dump(), owner_id=current_user["id"])
    prop_dict = prop.model_dump()
    prop_dict["created_at"] = prop_dict["created_at"].isoformat()
    await db.properties.insert_one(prop_dict)
    return prop

@api_router.put("/properties/{property_id}", response_model=Property)
async def update_property(property_id: str, property_data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = property_data.model_dump()
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return updated

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    # Also delete related rooms
    await db.rooms.delete_many({"property_id": property_id})
    return {"message": "Property deleted successfully"}

# ======================== ROOM ENDPOINTS ========================

@api_router.get("/rooms", response_model=List[Room])
async def get_rooms(property_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"property_id": property_id} if property_id else {}
    rooms = await db.rooms.find(query, {"_id": 0}).to_list(1000)
    return rooms

@api_router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@api_router.post("/rooms", response_model=Room)
async def create_room(room_data: RoomCreate, current_user: dict = Depends(get_current_user)):
    # Verify property exists
    prop = await db.properties.find_one({"id": room_data.property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    room = Room(**room_data.model_dump())
    # Initialize beds
    room.beds = [BedInfo(bed_number=i+1) for i in range(room.number_of_beds)]
    
    room_dict = room.model_dump()
    room_dict["created_at"] = room_dict["created_at"].isoformat()
    await db.rooms.insert_one(room_dict)
    return room

@api_router.put("/rooms/{room_id}", response_model=Room)
async def update_room(room_id: str, room_data: RoomBase, current_user: dict = Depends(get_current_user)):
    existing = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Room not found")
    
    update_data = room_data.model_dump()
    await db.rooms.update_one({"id": room_id}, {"$set": update_data})
    
    updated = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return updated

@api_router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.rooms.delete_one({"id": room_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room deleted successfully"}

# ======================== RESIDENT ENDPOINTS ========================

@api_router.get("/residents", response_model=List[Resident])
async def get_residents(
    property_id: Optional[str] = None,
    status: Optional[ResidentStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if status:
        query["status"] = status
    
    residents = await db.residents.find(query, {"_id": 0}).to_list(1000)
    return residents

@api_router.get("/residents/{resident_id}", response_model=Resident)
async def get_resident(resident_id: str, current_user: dict = Depends(get_current_user)):
    resident = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident

@api_router.post("/residents", response_model=Resident)
async def create_resident(resident_data: ResidentCreate, current_user: dict = Depends(get_current_user)):
    # Verify room exists and bed is available
    room = await db.rooms.find_one({"id": resident_data.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check bed availability
    beds = room.get("beds", [])
    bed_idx = resident_data.bed_number - 1
    if bed_idx < 0 or bed_idx >= len(beds):
        raise HTTPException(status_code=400, detail="Invalid bed number")
    if beds[bed_idx].get("is_occupied"):
        raise HTTPException(status_code=400, detail="Bed is already occupied")
    
    resident = Resident(**resident_data.model_dump())
    resident_dict = resident.model_dump()
    resident_dict["created_at"] = resident_dict["created_at"].isoformat()
    resident_dict["check_in_date"] = resident_dict["check_in_date"].isoformat()
    resident_dict["contract_end_date"] = resident_dict["contract_end_date"].isoformat()
    
    await db.residents.insert_one(resident_dict)
    
    # Update bed status
    beds[bed_idx]["is_occupied"] = True
    beds[bed_idx]["resident_id"] = resident.id
    
    # Check if room should be marked as occupied
    occupied_count = sum(1 for b in beds if b.get("is_occupied"))
    new_status = RoomStatus.OCCUPIED if occupied_count == len(beds) else room.get("status", RoomStatus.AVAILABLE)
    if occupied_count > 0 and new_status == RoomStatus.AVAILABLE:
        new_status = RoomStatus.AVAILABLE  # Partially occupied still shows as available
    
    await db.rooms.update_one(
        {"id": resident_data.room_id},
        {"$set": {"beds": beds, "status": new_status if occupied_count == len(beds) else RoomStatus.AVAILABLE}}
    )
    
    return resident

@api_router.put("/residents/{resident_id}", response_model=Resident)
async def update_resident(resident_id: str, update_data: ResidentUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if "contract_end_date" in update_dict and update_dict["contract_end_date"]:
        update_dict["contract_end_date"] = update_dict["contract_end_date"].isoformat()
    
    if update_dict:
        await db.residents.update_one({"id": resident_id}, {"$set": update_dict})
    
    updated = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    return updated

@api_router.delete("/residents/{resident_id}")
async def delete_resident(resident_id: str, current_user: dict = Depends(get_current_user)):
    resident = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    # Free up the bed
    room = await db.rooms.find_one({"id": resident["room_id"]}, {"_id": 0})
    if room:
        beds = room.get("beds", [])
        bed_idx = resident["bed_number"] - 1
        if 0 <= bed_idx < len(beds):
            beds[bed_idx]["is_occupied"] = False
            beds[bed_idx]["resident_id"] = None
            await db.rooms.update_one({"id": resident["room_id"]}, {"$set": {"beds": beds}})
    
    await db.residents.delete_one({"id": resident_id})
    return {"message": "Resident deleted successfully"}

# ======================== PAYMENT ENDPOINTS ========================

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    resident_id: Optional[str] = None,
    status: Optional[PaymentStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if resident_id:
        query["resident_id"] = resident_id
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    return payments

@api_router.get("/payments/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    # Verify resident exists
    resident = await db.residents.find_one({"id": payment_data.resident_id})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    payment = Payment(**payment_data.model_dump())
    payment.total_amount = (
        payment.base_rent +
        payment.electricity_charge +
        payment.food_charge +
        payment.maintenance_charge
    )
    
    payment_dict = payment.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    payment_dict["due_date"] = payment_dict["due_date"].isoformat()
    if payment_dict.get("payment_date"):
        payment_dict["payment_date"] = payment_dict["payment_date"].isoformat()
    
    await db.payments.insert_one(payment_dict)
    return payment

@api_router.put("/payments/{payment_id}", response_model=Payment)
async def update_payment(payment_id: str, update_data: PaymentUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if "payment_date" in update_dict and update_dict["payment_date"]:
        update_dict["payment_date"] = update_dict["payment_date"].isoformat()
    
    if update_dict:
        await db.payments.update_one({"id": payment_id}, {"$set": update_dict})
    
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    return updated

@api_router.post("/payments/generate-invoice/{resident_id}")
async def generate_invoice(resident_id: str, month: str, current_user: dict = Depends(get_current_user)):
    """Generate monthly invoice for a resident"""
    resident = await db.residents.find_one({"id": resident_id}, {"_id": 0})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    room = await db.rooms.find_one({"id": resident["room_id"]}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check if invoice already exists for this month
    existing = await db.payments.find_one({"resident_id": resident_id, "invoice_month": month})
    if existing:
        raise HTTPException(status_code=400, detail="Invoice already exists for this month")
    
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    rent_due_day = settings.get("rent_due_day", 5) if settings else 5
    
    # Parse month and create due date
    year, mon = map(int, month.split("-"))
    due_date = datetime(year, mon, rent_due_day, tzinfo=timezone.utc)
    
    payment = Payment(
        resident_id=resident_id,
        invoice_month=month,
        base_rent=room["rent_amount"],
        electricity_charge=0,
        food_charge=0,
        maintenance_charge=0,
        due_date=due_date,
        total_amount=room["rent_amount"]
    )
    
    payment_dict = payment.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    payment_dict["due_date"] = payment_dict["due_date"].isoformat()
    
    await db.payments.insert_one(payment_dict)
    return payment

# ======================== COMPLAINT ENDPOINTS ========================

@api_router.get("/complaints", response_model=List[Complaint])
async def get_complaints(
    status: Optional[ComplaintStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    complaints = await db.complaints.find(query, {"_id": 0}).to_list(1000)
    return complaints

@api_router.get("/complaints/{complaint_id}", response_model=Complaint)
async def get_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    complaint = await db.complaints.find_one({"id": complaint_id}, {"_id": 0})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@api_router.post("/complaints", response_model=Complaint)
async def create_complaint(complaint_data: ComplaintCreate, current_user: dict = Depends(get_current_user)):
    complaint = Complaint(**complaint_data.model_dump())
    complaint_dict = complaint.model_dump()
    complaint_dict["created_at"] = complaint_dict["created_at"].isoformat()
    if complaint_dict.get("resolved_at"):
        complaint_dict["resolved_at"] = complaint_dict["resolved_at"].isoformat()
    
    await db.complaints.insert_one(complaint_dict)
    return complaint

@api_router.put("/complaints/{complaint_id}", response_model=Complaint)
async def update_complaint(complaint_id: str, update_data: ComplaintUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.complaints.find_one({"id": complaint_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # If status is being set to resolved, set resolved_at
    if update_dict.get("status") == ComplaintStatus.RESOLVED:
        update_dict["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_dict:
        await db.complaints.update_one({"id": complaint_id}, {"$set": update_dict})
    
    updated = await db.complaints.find_one({"id": complaint_id}, {"_id": 0})
    return updated

@api_router.delete("/complaints/{complaint_id}")
async def delete_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.complaints.delete_one({"id": complaint_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {"message": "Complaint deleted successfully"}

# ======================== STAFF ENDPOINTS ========================

@api_router.get("/staff", response_model=List[Staff])
async def get_staff(
    property_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if property_id:
        query["assigned_property_id"] = property_id
    
    staff = await db.staff.find(query, {"_id": 0}).to_list(1000)
    return staff

@api_router.get("/staff/{staff_id}", response_model=Staff)
async def get_staff_member(staff_id: str, current_user: dict = Depends(get_current_user)):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@api_router.post("/staff", response_model=Staff)
async def create_staff(staff_data: StaffCreate, current_user: dict = Depends(get_current_user)):
    staff = Staff(**staff_data.model_dump())
    staff_dict = staff.model_dump()
    staff_dict["created_at"] = staff_dict["created_at"].isoformat()
    
    await db.staff.insert_one(staff_dict)
    return staff

@api_router.put("/staff/{staff_id}", response_model=Staff)
async def update_staff(staff_id: str, staff_data: StaffBase, current_user: dict = Depends(get_current_user)):
    existing = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    update_data = staff_data.model_dump()
    await db.staff.update_one({"id": staff_id}, {"$set": update_data})
    
    updated = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    return updated

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted successfully"}

# ======================== NOTICE ENDPOINTS ========================

@api_router.get("/notices", response_model=List[Notice])
async def get_notices(current_user: dict = Depends(get_current_user)):
    notices = await db.notices.find({}, {"_id": 0}).to_list(1000)
    return notices

@api_router.get("/notices/{notice_id}", response_model=Notice)
async def get_notice(notice_id: str, current_user: dict = Depends(get_current_user)):
    notice = await db.notices.find_one({"id": notice_id}, {"_id": 0})
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    return notice

@api_router.post("/notices", response_model=Notice)
async def create_notice(notice_data: NoticeCreate, current_user: dict = Depends(get_current_user)):
    notice = Notice(**notice_data.model_dump(), created_by=current_user["id"])
    notice_dict = notice.model_dump()
    notice_dict["created_at"] = notice_dict["created_at"].isoformat()
    
    await db.notices.insert_one(notice_dict)
    return notice

@api_router.put("/notices/{notice_id}", response_model=Notice)
async def update_notice(notice_id: str, notice_data: NoticeBase, current_user: dict = Depends(get_current_user)):
    existing = await db.notices.find_one({"id": notice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Notice not found")
    
    update_data = notice_data.model_dump()
    await db.notices.update_one({"id": notice_id}, {"$set": update_data})
    
    updated = await db.notices.find_one({"id": notice_id}, {"_id": 0})
    return updated

@api_router.delete("/notices/{notice_id}")
async def delete_notice(notice_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notices.delete_one({"id": notice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice deleted successfully"}

# ======================== SETTINGS ENDPOINTS ========================

@api_router.get("/settings", response_model=Settings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        # Return default settings
        return Settings()
    return settings

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings_data: Settings, current_user: dict = Depends(get_current_user)):
    settings_dict = settings_data.model_dump()
    settings_dict["id"] = "default"
    
    await db.settings.update_one(
        {"id": "default"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return settings_data

# ======================== DASHBOARD ENDPOINTS ========================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Get counts
    total_properties = await db.properties.count_documents({})
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({"status": RoomStatus.OCCUPIED})
    vacant_rooms = total_rooms - occupied_rooms
    total_residents = await db.residents.count_documents({"status": ResidentStatus.ACTIVE})
    
    # Get pending dues
    pending_payments = await db.payments.find(
        {"status": {"$in": [PaymentStatus.PENDING, PaymentStatus.OVERDUE]}},
        {"_id": 0, "total_amount": 1}
    ).to_list(1000)
    pending_dues = sum(p.get("total_amount", 0) for p in pending_payments)
    
    # Get monthly revenue (current month paid payments)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    paid_payments = await db.payments.find(
        {"status": PaymentStatus.PAID, "invoice_month": current_month},
        {"_id": 0, "total_amount": 1}
    ).to_list(1000)
    monthly_revenue = sum(p.get("total_amount", 0) for p in paid_payments)
    
    return DashboardStats(
        total_properties=total_properties,
        total_rooms=total_rooms,
        occupied_rooms=occupied_rooms,
        vacant_rooms=vacant_rooms,
        total_residents=total_residents,
        pending_dues=pending_dues,
        monthly_revenue=monthly_revenue
    )

@api_router.get("/dashboard/revenue-chart")
async def get_revenue_chart(current_user: dict = Depends(get_current_user)):
    """Get last 6 months revenue data for chart"""
    now = datetime.now(timezone.utc)
    data = []
    
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=i*30)
        month_str = month_date.strftime("%Y-%m")
        month_name = month_date.strftime("%b")
        
        paid_payments = await db.payments.find(
            {"status": PaymentStatus.PAID, "invoice_month": month_str},
            {"_id": 0, "total_amount": 1}
        ).to_list(1000)
        
        revenue = sum(p.get("total_amount", 0) for p in paid_payments)
        data.append({"month": month_name, "revenue": revenue})
    
    return data

@api_router.get("/dashboard/occupancy-chart")
async def get_occupancy_chart(current_user: dict = Depends(get_current_user)):
    """Get occupancy data by property for chart"""
    properties = await db.properties.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    data = []
    
    for prop in properties:
        total_beds = 0
        occupied_beds = 0
        rooms = await db.rooms.find({"property_id": prop["id"]}, {"_id": 0, "beds": 1}).to_list(1000)
        
        for room in rooms:
            beds = room.get("beds", [])
            total_beds += len(beds)
            occupied_beds += sum(1 for b in beds if b.get("is_occupied"))
        
        occupancy_rate = (occupied_beds / total_beds * 100) if total_beds > 0 else 0
        data.append({
            "property": prop["name"][:15],
            "occupancy": round(occupancy_rate, 1),
            "total_beds": total_beds,
            "occupied_beds": occupied_beds
        })
    
    return data

@api_router.get("/dashboard/recent-payments")
async def get_recent_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    
    # Enrich with resident names
    for payment in payments:
        resident = await db.residents.find_one({"id": payment["resident_id"]}, {"_id": 0, "name": 1})
        payment["resident_name"] = resident["name"] if resident else "Unknown"
    
    return payments

@api_router.get("/dashboard/recent-complaints")
async def get_recent_complaints(current_user: dict = Depends(get_current_user)):
    complaints = await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    
    # Enrich with resident names
    for complaint in complaints:
        resident = await db.residents.find_one({"id": complaint["resident_id"]}, {"_id": 0, "name": 1})
        complaint["resident_name"] = resident["name"] if resident else "Unknown"
    
    return complaints

# ======================== REPORTS ENDPOINTS ========================

@api_router.get("/reports/revenue")
async def get_revenue_report(
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if start_month and end_month:
        query["invoice_month"] = {"$gte": start_month, "$lte": end_month}
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
    
    # Group by month
    monthly_data = {}
    for p in payments:
        month = p.get("invoice_month", "Unknown")
        if month not in monthly_data:
            monthly_data[month] = {"total": 0, "paid": 0, "pending": 0, "overdue": 0}
        
        monthly_data[month]["total"] += p.get("total_amount", 0)
        if p.get("status") == PaymentStatus.PAID:
            monthly_data[month]["paid"] += p.get("total_amount", 0)
        elif p.get("status") == PaymentStatus.OVERDUE:
            monthly_data[month]["overdue"] += p.get("total_amount", 0)
        else:
            monthly_data[month]["pending"] += p.get("total_amount", 0)
    
    return [{"month": k, **v} for k, v in sorted(monthly_data.items())]

@api_router.get("/reports/occupancy")
async def get_occupancy_report(current_user: dict = Depends(get_current_user)):
    properties = await db.properties.find({}, {"_id": 0}).to_list(100)
    report = []
    
    for prop in properties:
        rooms = await db.rooms.find({"property_id": prop["id"]}, {"_id": 0}).to_list(1000)
        
        total_rooms = len(rooms)
        total_beds = sum(r.get("number_of_beds", 0) for r in rooms)
        occupied_beds = 0
        
        for room in rooms:
            beds = room.get("beds", [])
            occupied_beds += sum(1 for b in beds if b.get("is_occupied"))
        
        report.append({
            "property_id": prop["id"],
            "property_name": prop["name"],
            "city": prop["city"],
            "total_rooms": total_rooms,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "vacant_beds": total_beds - occupied_beds,
            "occupancy_rate": round((occupied_beds / total_beds * 100) if total_beds > 0 else 0, 1)
        })
    
    return report

@api_router.get("/reports/outstanding-dues")
async def get_outstanding_dues_report(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find(
        {"status": {"$in": [PaymentStatus.PENDING, PaymentStatus.OVERDUE]}},
        {"_id": 0}
    ).to_list(10000)
    
    report = []
    for p in payments:
        resident = await db.residents.find_one({"id": p["resident_id"]}, {"_id": 0})
        if resident:
            room = await db.rooms.find_one({"id": resident["room_id"]}, {"_id": 0, "room_number": 1})
            report.append({
                "payment_id": p["id"],
                "resident_id": p["resident_id"],
                "resident_name": resident["name"],
                "room_number": room["room_number"] if room else "N/A",
                "invoice_month": p["invoice_month"],
                "total_amount": p["total_amount"],
                "due_date": p["due_date"],
                "status": p["status"]
            })
    
    return report

@api_router.get("/reports/maintenance")
async def get_maintenance_report(current_user: dict = Depends(get_current_user)):
    complaints = await db.complaints.find({}, {"_id": 0}).to_list(10000)
    
    # Group by category
    by_category = {}
    for c in complaints:
        cat = c.get("category", "other")
        if cat not in by_category:
            by_category[cat] = {"total": 0, "open": 0, "in_progress": 0, "resolved": 0}
        
        by_category[cat]["total"] += 1
        status = c.get("status", "open")
        if status in by_category[cat]:
            by_category[cat][status] += 1
    
    return [{"category": k, **v} for k, v in by_category.items()]

@api_router.get("/reports/export/csv/{report_type}")
async def export_csv(report_type: str, current_user: dict = Depends(get_current_user)):
    """Export report as CSV"""
    if report_type == "revenue":
        data = await get_revenue_report(current_user=current_user)
        headers = ["month", "total", "paid", "pending", "overdue"]
    elif report_type == "occupancy":
        data = await get_occupancy_report(current_user=current_user)
        headers = ["property_name", "city", "total_rooms", "total_beds", "occupied_beds", "vacant_beds", "occupancy_rate"]
    elif report_type == "dues":
        data = await get_outstanding_dues_report(current_user=current_user)
        headers = ["resident_name", "room_number", "invoice_month", "total_amount", "due_date", "status"]
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    output = BytesIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')
    
    # Write BOM for Excel compatibility
    output.write('\ufeff'.encode('utf-8'))
    output.seek(0)
    
    # Create string buffer for CSV
    import io
    string_buffer = io.StringIO()
    writer = csv.DictWriter(string_buffer, fieldnames=headers, extrasaction='ignore')
    writer.writeheader()
    for row in data:
        writer.writerow(row)
    
    return StreamingResponse(
        iter([string_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"}
    )

@api_router.get("/reports/export/pdf/{report_type}")
async def export_pdf(report_type: str, current_user: dict = Depends(get_current_user)):
    """Export report as PDF"""
    if report_type == "revenue":
        data = await get_revenue_report(current_user=current_user)
        title = "Revenue Report"
        headers = ["Month", "Total", "Paid", "Pending", "Overdue"]
        rows = [[r["month"], f"₹{r['total']}", f"₹{r['paid']}", f"₹{r['pending']}", f"₹{r['overdue']}"] for r in data]
    elif report_type == "occupancy":
        data = await get_occupancy_report(current_user=current_user)
        title = "Occupancy Report"
        headers = ["Property", "City", "Total Beds", "Occupied", "Vacant", "Rate"]
        rows = [[r["property_name"], r["city"], r["total_beds"], r["occupied_beds"], r["vacant_beds"], f"{r['occupancy_rate']}%"] for r in data]
    elif report_type == "dues":
        data = await get_outstanding_dues_report(current_user=current_user)
        title = "Outstanding Dues Report"
        headers = ["Resident", "Room", "Month", "Amount", "Status"]
        rows = [[r["resident_name"], r["room_number"], r["invoice_month"], f"₹{r['total_amount']}", r["status"]] for r in data]
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30
    )
    
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Create table
    table_data = [headers] + rows
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F1F5F9')])
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"}
    )

# ======================== SEED DATA ENDPOINT ========================

@api_router.post("/seed-data")
async def seed_data():
    """Seed database with sample data"""
    # Check if data already exists
    existing_props = await db.properties.count_documents({})
    if existing_props > 0:
        return {"message": "Data already seeded"}
    
    # Create default admin user
    admin_user = User(
        email="admin@pgmanager.com",
        name="Admin User",
        role=UserRole.OWNER
    )
    admin_dict = admin_user.model_dump()
    admin_dict["password_hash"] = hash_password("admin123")
    admin_dict["created_at"] = admin_dict["created_at"].isoformat()
    await db.users.insert_one(admin_dict)
    
    # Create properties
    properties_data = [
        {"name": "Sunshine PG", "address": "123 Main Street", "city": "Bangalore", "state": "Karnataka", "pincode": "560001", "total_floors": 3, "amenities": ["WiFi", "AC", "Food", "Laundry", "Parking"]},
        {"name": "Green Valley Hostel", "address": "456 Park Road", "city": "Bangalore", "state": "Karnataka", "pincode": "560002", "total_floors": 2, "amenities": ["WiFi", "Food", "TV Room", "Gym"]},
        {"name": "Urban Stay PG", "address": "789 Tech Park", "city": "Hyderabad", "state": "Telangana", "pincode": "500001", "total_floors": 4, "amenities": ["WiFi", "AC", "Food", "Power Backup"]}
    ]
    
    property_ids = []
    for p_data in properties_data:
        prop = Property(**p_data, owner_id=admin_user.id)
        prop_dict = prop.model_dump()
        prop_dict["created_at"] = prop_dict["created_at"].isoformat()
        await db.properties.insert_one(prop_dict)
        property_ids.append(prop.id)
    
    # Create rooms for each property
    room_configs = [
        {"room_type": RoomType.SINGLE, "number_of_beds": 1, "rent_amount": 8000, "security_deposit": 16000},
        {"room_type": RoomType.DOUBLE, "number_of_beds": 2, "rent_amount": 6000, "security_deposit": 12000},
        {"room_type": RoomType.TRIPLE, "number_of_beds": 3, "rent_amount": 5000, "security_deposit": 10000}
    ]
    
    room_ids = []
    for prop_id in property_ids:
        for floor in range(1, 4):
            for room_num in range(1, 5):
                config = room_configs[room_num % 3]
                room = Room(
                    property_id=prop_id,
                    room_number=f"{floor}0{room_num}",
                    room_type=config["room_type"],
                    number_of_beds=config["number_of_beds"],
                    rent_amount=config["rent_amount"],
                    security_deposit=config["security_deposit"],
                    floor=floor,
                    status=RoomStatus.AVAILABLE
                )
                room.beds = [BedInfo(bed_number=i+1) for i in range(room.number_of_beds)]
                room_dict = room.model_dump()
                room_dict["created_at"] = room_dict["created_at"].isoformat()
                await db.rooms.insert_one(room_dict)
                room_ids.append({"id": room.id, "property_id": prop_id, "beds": room.number_of_beds, "rent": room.rent_amount})
    
    # Create residents
    resident_names = [
        "Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Reddy", "Vikram Singh",
        "Ananya Gupta", "Karthik Nair", "Meera Joshi", "Arjun Das", "Pooja Mehta",
        "Rohan Verma", "Divya Iyer", "Sanjay Rao", "Neha Kapoor", "Aditya Menon"
    ]
    
    resident_ids = []
    room_idx = 0
    for i, name in enumerate(resident_names):
        if room_idx >= len(room_ids):
            break
        
        room_info = room_ids[room_idx]
        resident = Resident(
            name=name,
            phone=f"+91 98765{i:05d}",
            email=f"{name.lower().replace(' ', '.')}@email.com",
            emergency_contact=f"+91 98764{i:05d}",
            property_id=room_info["property_id"],
            room_id=room_info["id"],
            bed_number=1,
            check_in_date=datetime.now(timezone.utc) - timedelta(days=30*(i%6)+10),
            contract_end_date=datetime.now(timezone.utc) + timedelta(days=180),
            deposit_paid=room_info["rent"] * 2,
            status=ResidentStatus.ACTIVE
        )
        resident_dict = resident.model_dump()
        resident_dict["created_at"] = resident_dict["created_at"].isoformat()
        resident_dict["check_in_date"] = resident_dict["check_in_date"].isoformat()
        resident_dict["contract_end_date"] = resident_dict["contract_end_date"].isoformat()
        await db.residents.insert_one(resident_dict)
        resident_ids.append({"id": resident.id, "room_id": room_info["id"], "rent": room_info["rent"]})
        
        # Update room bed status
        await db.rooms.update_one(
            {"id": room_info["id"]},
            {"$set": {"beds.0.is_occupied": True, "beds.0.resident_id": resident.id}}
        )
        
        room_idx += 1
    
    # Create payments
    for res_info in resident_ids:
        for month_offset in range(-3, 1):
            month_date = datetime.now(timezone.utc) + timedelta(days=month_offset*30)
            month_str = month_date.strftime("%Y-%m")
            
            status = PaymentStatus.PAID if month_offset < 0 else PaymentStatus.PENDING
            payment = Payment(
                resident_id=res_info["id"],
                invoice_month=month_str,
                base_rent=res_info["rent"],
                electricity_charge=200,
                food_charge=2500,
                maintenance_charge=300,
                due_date=datetime(month_date.year, month_date.month, 5, tzinfo=timezone.utc),
                total_amount=res_info["rent"] + 3000,
                status=status,
                payment_method="UPI" if status == PaymentStatus.PAID else None,
                payment_date=month_date if status == PaymentStatus.PAID else None
            )
            payment_dict = payment.model_dump()
            payment_dict["created_at"] = payment_dict["created_at"].isoformat()
            payment_dict["due_date"] = payment_dict["due_date"].isoformat()
            if payment_dict.get("payment_date"):
                payment_dict["payment_date"] = payment_dict["payment_date"].isoformat()
            await db.payments.insert_one(payment_dict)
    
    # Create complaints
    complaint_data = [
        {"category": ComplaintCategory.PLUMBING, "description": "Water leakage in bathroom"},
        {"category": ComplaintCategory.ELECTRICAL, "description": "Fan not working"},
        {"category": ComplaintCategory.AC_COOLER, "description": "AC not cooling properly"},
        {"category": ComplaintCategory.INTERNET, "description": "WiFi connection issues"},
        {"category": ComplaintCategory.CLEANING, "description": "Room not cleaned properly"}
    ]
    
    for i, comp_data in enumerate(complaint_data):
        if i >= len(resident_ids):
            break
        res_info = resident_ids[i]
        complaint = Complaint(
            resident_id=res_info["id"],
            room_id=res_info["room_id"],
            category=comp_data["category"],
            description=comp_data["description"],
            status=ComplaintStatus.OPEN if i < 2 else ComplaintStatus.IN_PROGRESS if i < 4 else ComplaintStatus.RESOLVED
        )
        complaint_dict = complaint.model_dump()
        complaint_dict["created_at"] = complaint_dict["created_at"].isoformat()
        if complaint_dict.get("resolved_at"):
            complaint_dict["resolved_at"] = complaint_dict["resolved_at"].isoformat()
        await db.complaints.insert_one(complaint_dict)
    
    # Create staff
    staff_data = [
        {"name": "Rajesh Kumar", "phone": "+91 99887 00001", "role": StaffRole.WARDEN, "salary": 25000},
        {"name": "Sunita Devi", "phone": "+91 99887 00002", "role": StaffRole.CLEANER, "salary": 12000},
        {"name": "Mohammed Ali", "phone": "+91 99887 00003", "role": StaffRole.COOK, "salary": 18000},
        {"name": "Prakash Yadav", "phone": "+91 99887 00004", "role": StaffRole.MAINTENANCE, "salary": 15000}
    ]
    
    for i, s_data in enumerate(staff_data):
        staff = Staff(
            **s_data,
            assigned_property_id=property_ids[i % len(property_ids)],
            status=StaffStatus.ACTIVE
        )
        staff_dict = staff.model_dump()
        staff_dict["created_at"] = staff_dict["created_at"].isoformat()
        await db.staff.insert_one(staff_dict)
    
    # Create notices
    notices_data = [
        {"title": "Monthly Maintenance", "description": "Building maintenance will be conducted on Sunday from 10 AM to 4 PM.", "priority": NoticePriority.NORMAL},
        {"title": "Rent Due Reminder", "description": "Please ensure your rent is paid by the 5th of every month to avoid late fees.", "priority": NoticePriority.IMPORTANT},
        {"title": "WiFi Upgrade", "description": "We are upgrading our WiFi infrastructure. Expect improved speeds from next week.", "priority": NoticePriority.NORMAL}
    ]
    
    for n_data in notices_data:
        notice = Notice(**n_data, created_by=admin_user.id)
        notice_dict = notice.model_dump()
        notice_dict["created_at"] = notice_dict["created_at"].isoformat()
        await db.notices.insert_one(notice_dict)
    
    # Create default settings
    settings = Settings()
    await db.settings.update_one({"id": "default"}, {"$set": settings.model_dump()}, upsert=True)
    
    return {"message": "Sample data seeded successfully", "admin_email": "admin@pgmanager.com", "admin_password": "admin123"}

# ======================== ROOT ENDPOINT ========================

@api_router.get("/")
async def root():
    return {"message": "PG Manager Pro API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
