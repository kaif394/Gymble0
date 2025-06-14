from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from enum import Enum
import jwt
import bcrypt
from fastapi.responses import JSONResponse, HTMLResponse
import qrcode
import io
import base64
import hashlib
import time
from datetime import timedelta
import calendar
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'fallback-secret-key-for-development-only')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

security = HTTPBearer()

# Enums
class MembershipStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    PENDING = "pending"

class UserRole(str, Enum):
    OWNER = "owner"
    STAFF = "staff"
    MEMBER = "member"

class PaymentStatus(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"
    FAILED = "failed"

class PaymentMethod(str, Enum):
    CASH = "cash"
    GOOGLE_PAY = "google_pay"
    PHONE_PE = "phone_pe"
    PAYTM = "paytm"
    UPI = "upi"
    CARD = "card"

class PlanType(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    VIP = "vip"
    FAMILY = "family"

# Authentication Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    role: UserRole = UserRole.OWNER
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('phone')
    def validate_phone(cls, v):
        # Basic phone validation (digits, spaces, hyphens, plus)
        if not re.match(r'^[+]?[\d\s\-()]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

class MemberRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    gym_id: str
    plan_id: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('phone')
    def validate_phone(cls, v):
        if not re.match(r'^[+]?[\d\s\-()]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Gym Models
class Gym(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    owner_id: str
    address: str
    phone: str
    email: str
    description: Optional[str] = None
    qr_code_data: Optional[str] = None  # UPI ID or payment details
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class GymCreate(BaseModel):
    name: str
    address: str
    phone: str
    email: str
    description: Optional[str] = None
    qr_code_data: Optional[str] = None

# Plan Models
class Plan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    name: str
    description: str
    price: float  # In Indian Rupees
    duration_days: int
    plan_type: PlanType
    features: List[str] = []
    auto_renewal: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class PlanCreate(BaseModel):
    name: str
    description: str
    price: float
    duration_days: int
    plan_type: PlanType
    features: List[str] = []
    auto_renewal: bool = True

# Member Models
class Member(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    name: str
    email: str
    password_hash: Optional[str] = None
    phone: str
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    emergency_contact: Optional[str] = None
    plan_id: str
    membership_status: MembershipStatus = MembershipStatus.ACTIVE
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_visit: Optional[datetime] = None
    total_visits: int = 0
    auto_renewal: bool = True

class MemberCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: str
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    emergency_contact: Optional[str] = None
    plan_id: str
    payment_method: PaymentMethod
    payment_amount: float
    auto_renewal: bool = True

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    membership_status: Optional[MembershipStatus] = None
    auto_renewal: Optional[bool] = None

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    name: str
    phone: str
    role: UserRole
    gym_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

# Payment Models
class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    member_id: str
    member_name: str
    amount: float
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    payment_method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PAID
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
    plan_id: str
    plan_name: str

class PaymentCreate(BaseModel):
    member_id: str
    amount: float
    payment_method: PaymentMethod
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

# Check-in Models
class CheckIn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    member_id: str
    member_name: str
    check_in_time: datetime = Field(default_factory=datetime.utcnow)
    check_out_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None

class CheckInCreate(BaseModel):
    member_id: str

# Announcement Models
class Announcement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    title: str
    content: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    priority: str = "normal"  # normal, high, urgent

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"

# Attendance Models
class AttendanceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    member_id: str
    member_name: str
    check_in_time: datetime = Field(default_factory=datetime.utcnow)
    check_out_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    qr_code_data: str  # The QR code data used for check-in
    ip_address: Optional[str] = None
    device_info: Optional[str] = None

# Workout Plan Models
class ExerciseSet(BaseModel):
    exercise_name: str
    sets: int
    reps: str  # Can be "10-12" or "10" or "15+"
    weight: Optional[str] = None  # "50kg" or "bodyweight"
    rest_time: Optional[str] = None  # "60 seconds"
    notes: Optional[str] = None

class WorkoutTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    name: str
    description: str
    category: str  # "Strength", "Cardio", "HIIT", "Yoga", etc.
    target_muscle_groups: List[str] = []
    estimated_duration: int  # in minutes
    difficulty_level: str  # "Beginner", "Intermediate", "Advanced"
    exercises: List[ExerciseSet] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class WorkoutTemplateCreate(BaseModel):
    name: str
    description: str
    category: str
    target_muscle_groups: List[str] = []
    estimated_duration: int
    difficulty_level: str
    exercises: List[ExerciseSet] = []

# Diet Plan Models
class MealItem(BaseModel):
    food_name: str
    quantity: str
    calories: Optional[int] = None
    protein: Optional[float] = None  # in grams
    carbs: Optional[float] = None    # in grams
    fat: Optional[float] = None      # in grams
    notes: Optional[str] = None

class Meal(BaseModel):
    meal_type: str  # "Breakfast", "Lunch", "Dinner", "Snack"
    time: str  # "7:00 AM"
    items: List[MealItem] = []

class DietTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    name: str
    description: str
    goal: str  # "Weight Loss", "Muscle Gain", "Maintenance", "Cutting"
    total_calories: Optional[int] = None
    protein_target: Optional[float] = None  # in grams
    carbs_target: Optional[float] = None    # in grams
    fat_target: Optional[float] = None      # in grams
    meals: List[Meal] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class DietTemplateCreate(BaseModel):
    name: str
    description: str
    goal: str
    total_calories: Optional[int] = None
    protein_target: Optional[float] = None
    carbs_target: Optional[float] = None
    fat_target: Optional[float] = None
    meals: List[Meal] = []

# Member Plan Assignment Models
class MemberPlanAssignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    member_id: str
    member_name: str
    plan_type: str  # "workout" or "diet"
    plan_id: str  # workout_template_id or diet_template_id
    plan_name: str
    assigned_by: str  # gym owner/staff name
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    is_active: bool = True
    notes: Optional[str] = None

class PlanAssignmentCreate(BaseModel):
    member_id: str
    plan_type: str  # "workout" or "diet"
    plan_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None

# Member Progress Tracking Models
class ExerciseProgress(BaseModel):
    exercise_name: str
    completed_sets: int
    completed_reps: List[int] = []  # reps completed in each set
    weights_used: List[str] = []    # weights used in each set
    notes: Optional[str] = None

class WorkoutProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    member_id: str
    assignment_id: str  # reference to MemberPlanAssignment
    workout_template_id: str
    workout_name: str
    scheduled_date: datetime
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    exercises_progress: List[ExerciseProgress] = []
    overall_rating: Optional[int] = None  # 1-5 rating
    notes: Optional[str] = None
    status: str = "pending"  # "pending", "completed", "skipped"

class MealProgress(BaseModel):
    meal_type: str
    items_consumed: List[str] = []  # list of food names consumed
    total_calories: Optional[int] = None
    notes: Optional[str] = None

class DietProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gym_id: str
    member_id: str
    assignment_id: str  # reference to MemberPlanAssignment
    diet_template_id: str
    diet_name: str
    date: datetime
    meals_progress: List[MealProgress] = []
    total_calories_consumed: Optional[int] = None
    water_intake_liters: Optional[float] = None
    overall_rating: Optional[int] = None  # 1-5 rating
    notes: Optional[str] = None
    status: str = "pending"  # "pending", "completed"

class WorkoutProgressCreate(BaseModel):
    assignment_id: str
    scheduled_date: datetime
    duration_minutes: Optional[int] = None
    exercises_progress: List[ExerciseProgress] = []
    overall_rating: Optional[int] = None
    notes: Optional[str] = None
    status: str = "completed"

class DietProgressCreate(BaseModel):
    assignment_id: str
    date: datetime
    meals_progress: List[MealProgress] = []
    total_calories_consumed: Optional[int] = None
    water_intake_liters: Optional[float] = None
    overall_rating: Optional[int] = None
    notes: Optional[str] = None

class AttendanceMarkRequest(BaseModel):
    qr_code_data: str
    device_info: Optional[str] = None

class QRCodeResponse(BaseModel):
    qr_code_data: str
    qr_code_image: str  # Base64 encoded image
    expires_at: datetime
    
class AttendanceStats(BaseModel):
    date: str
    total_attendance: int
    unique_members: int
    member_details: List[dict] = []

# Dashboard Models
class DashboardStats(BaseModel):
    total_members: int
    active_members: int
    today_checkins: int
    current_checkedin: int
    monthly_revenue: float
    expiring_soon: int
    total_plans: int
    popular_plan: Optional[str] = None

class RevenueData(BaseModel):
    month: str
    revenue: float

class MembershipData(BaseModel):
    plan_name: str
    count: int

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_dynamic_qr_code(gym_id: str) -> tuple[str, str, datetime]:
    """Generate a dynamic QR code that changes every 5 minutes for security"""
    current_time = int(time.time())
    # Round to nearest 5 minutes for consistent generation
    time_slot = (current_time // 300) * 300
    
    # Create unique data combining gym_id and time slot
    qr_data = f"GYMBLE_ATTENDANCE:{gym_id}:{time_slot}"
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Generate QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode()
    
    # Calculate expiry time (next 5-minute slot)
    expires_at = datetime.fromtimestamp(time_slot + 300)
    
    return qr_data, img_base64, expires_at

def validate_qr_code(qr_data: str, gym_id: str) -> bool:
    """Validate if QR code is valid and not expired"""
    try:
        parts = qr_data.split(':')
        if len(parts) != 3 or parts[0] != "GYMBLE_ATTENDANCE":
            return False
        
        qr_gym_id = parts[1]
        qr_time_slot = int(parts[2])
        
        if qr_gym_id != gym_id:
            return False
        
        current_time = int(time.time())
        current_slot = (current_time // 300) * 300
        
        # Allow current slot and previous slot (10 minutes total validity)
        valid_slots = [current_slot, current_slot - 300]
        
        return qr_time_slot in valid_slots
    except:
        return False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_current_owner(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owners can access this resource")
    return current_user

async def get_current_owner_or_staff(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.STAFF]:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

# API Routes

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        await client.admin.command('ismaster')
        return {
            "status": "healthy",
            "service": "GYMBLE API",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unhealthy: Database connection failed - {str(e)}"
        )

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "GYMBLE API is running", "status": "success"}

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register_user(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user
    user = User(
        **user_data.dict(exclude={"password"}),
        password_hash=password_hash
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user.dict(exclude={"password_hash"})
    )

@api_router.post("/auth/register-member", response_model=Token)
async def register_member(member_data: MemberRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": member_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Verify gym exists
    gym = await db.gyms.find_one({"id": member_data.gym_id})
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    # Verify plan exists and belongs to the gym
    plan = await db.plans.find_one({"id": member_data.plan_id, "gym_id": member_data.gym_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found for this gym")
    
    # Hash password
    password_hash = hash_password(member_data.password)
    
    # Create user account
    user = User(
        email=member_data.email,
        password_hash=password_hash,
        name=member_data.name,
        phone=member_data.phone,
        role=UserRole.MEMBER,
        gym_id=member_data.gym_id
    )
    
    await db.users.insert_one(user.dict())
    
    # Create member record
    from datetime import timedelta
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=plan["duration_days"])
    
    member = Member(
        gym_id=member_data.gym_id,
        name=member_data.name,
        email=member_data.email,
        password_hash=password_hash,
        phone=member_data.phone,
        plan_id=member_data.plan_id,
        start_date=start_date,
        end_date=end_date
    )
    
    await db.members.insert_one(member.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user.dict(exclude={"password_hash"})
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_obj = User(**user)
    access_token = create_access_token(data={"sub": user_obj.email})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_obj.dict(exclude={"password_hash"})
    )

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user.dict(exclude={"password_hash"})

# Gym Management Routes
@api_router.post("/gyms", response_model=Gym)
async def create_gym(gym_data: GymCreate, current_user: User = Depends(get_current_owner)):
    # Check if owner already has a gym
    existing_gym = await db.gyms.find_one({"owner_id": current_user.id})
    if existing_gym:
        raise HTTPException(status_code=400, detail="You already have a gym registered")
    
    gym = Gym(**gym_data.dict(), owner_id=current_user.id)
    await db.gyms.insert_one(gym.dict())
    
    # Update user with gym_id
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"gym_id": gym.id}}
    )
    
    return gym

@api_router.get("/gyms/all", response_model=List[Gym])
async def get_all_gyms():
    """Get all active gyms for member registration"""
    gyms = await db.gyms.find({"is_active": True}).to_list(1000)
    return [Gym(**gym) for gym in gyms]

@api_router.get("/gyms/my", response_model=Gym)
async def get_my_gym(current_user: User = Depends(get_current_user)):
    if not current_user.gym_id:
        raise HTTPException(status_code=404, detail="No gym found")
    
    gym = await db.gyms.find_one({"id": current_user.gym_id})
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    return Gym(**gym)

@api_router.put("/gyms/my", response_model=Gym)
async def update_my_gym(gym_update: GymCreate, current_user: User = Depends(get_current_owner)):
    if not current_user.gym_id:
        raise HTTPException(status_code=404, detail="No gym found")
    
    await db.gyms.update_one(
        {"id": current_user.gym_id},
        {"$set": gym_update.dict()}
    )
    
    updated_gym = await db.gyms.find_one({"id": current_user.gym_id})
    return Gym(**updated_gym)

# Plan Management Routes
@api_router.post("/plans", response_model=Plan)
async def create_plan(plan_data: PlanCreate, current_user: User = Depends(get_current_owner)):
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    plan = Plan(**plan_data.dict(), gym_id=current_user.gym_id)
    await db.plans.insert_one(plan.dict())
    return plan

@api_router.get("/plans", response_model=List[Plan])
async def get_plans(current_user: User = Depends(get_current_user)):
    if not current_user.gym_id:
        return []
    
    plans = await db.plans.find({"gym_id": current_user.gym_id, "is_active": True}).to_list(1000)
    return [Plan(**plan) for plan in plans]

@api_router.get("/plans/gym/{gym_id}", response_model=List[Plan])
async def get_gym_plans(gym_id: str):
    """Get all plans for a specific gym (for member registration)"""
    plans = await db.plans.find({"gym_id": gym_id, "is_active": True}).to_list(1000)
    return [Plan(**plan) for plan in plans]

@api_router.get("/plans/{plan_id}", response_model=Plan)
async def get_plan(plan_id: str, current_user: User = Depends(get_current_user)):
    plan = await db.plans.find_one({"id": plan_id, "gym_id": current_user.gym_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return Plan(**plan)

@api_router.put("/plans/{plan_id}", response_model=Plan)
async def update_plan(plan_id: str, plan_update: PlanCreate, current_user: User = Depends(get_current_owner)):
    plan = await db.plans.find_one({"id": plan_id, "gym_id": current_user.gym_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    await db.plans.update_one(
        {"id": plan_id},
        {"$set": plan_update.dict()}
    )
    
    updated_plan = await db.plans.find_one({"id": plan_id})
    return Plan(**updated_plan)

@api_router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, current_user: User = Depends(get_current_owner)):
    await db.plans.update_one(
        {"id": plan_id, "gym_id": current_user.gym_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Plan deleted successfully"}

# Member Management Routes
@api_router.post("/members", response_model=Member)
async def create_member(member_data: MemberCreate, current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    # Check if email already exists
    existing_member = await db.members.find_one({"email": member_data.email, "gym_id": current_user.gym_id})
    if existing_member:
        raise HTTPException(status_code=400, detail="Member with this email already exists")
    
    # Get plan details
    plan = await db.plans.find_one({"id": member_data.plan_id, "gym_id": current_user.gym_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Calculate end date
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=plan["duration_days"])
    
    # Hash password for member login
    password_hash = hash_password(member_data.password)
    
    # Create member
    member = Member(
        **member_data.dict(exclude={"password", "payment_method", "payment_amount"}),
        gym_id=current_user.gym_id,
        password_hash=password_hash,
        start_date=start_date,
        end_date=end_date
    )
    
    await db.members.insert_one(member.dict())
    
    # Create payment record
    payment = Payment(
        gym_id=current_user.gym_id,
        member_id=member.id,
        member_name=member.name,
        amount=member_data.payment_amount,
        payment_method=member_data.payment_method,
        plan_id=member_data.plan_id,
        plan_name=plan["name"]
    )
    
    await db.payments.insert_one(payment.dict())
    
    return member

@api_router.get("/members", response_model=List[Member])
async def get_members(status: Optional[str] = None, current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        return []
    
    query = {"gym_id": current_user.gym_id}
    if status:
        query["membership_status"] = status
    
    members = await db.members.find(query).sort("created_at", -1).to_list(1000)
    return [Member(**member) for member in members]

@api_router.get("/members/search/{query}")
async def search_members(query: str, current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        return []
    
    members = await db.members.find({
        "gym_id": current_user.gym_id,
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query, "$options": "i"}}
        ]
    }).limit(10).to_list(10)
    
    return [Member(**member) for member in members]

# Check-in Routes
@api_router.post("/checkin", response_model=CheckIn)
async def check_in_member(checkin_data: CheckInCreate, current_user: User = Depends(get_current_owner_or_staff)):
    member = await db.members.find_one({"id": checkin_data.member_id, "gym_id": current_user.gym_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if member already checked in today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_checkin = await db.checkins.find_one({
        "member_id": checkin_data.member_id,
        "check_in_time": {"$gte": today_start},
        "check_out_time": None
    })
    
    if existing_checkin:
        raise HTTPException(status_code=400, detail="Member already checked in")
    
    checkin = CheckIn(
        gym_id=current_user.gym_id,
        member_id=checkin_data.member_id,
        member_name=member["name"]
    )
    
    await db.checkins.insert_one(checkin.dict())
    
    # Update member's last visit and total visits
    await db.members.update_one(
        {"id": checkin_data.member_id},
        {
            "$set": {"last_visit": datetime.utcnow()},
            "$inc": {"total_visits": 1}
        }
    )
    
    return checkin

@api_router.get("/checkins/today", response_model=List[CheckIn])
async def get_today_checkins(current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        return []
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    checkins = await db.checkins.find({
        "gym_id": current_user.gym_id,
        "check_in_time": {"$gte": today_start}
    }).sort("check_in_time", -1).to_list(1000)
    
    return [CheckIn(**checkin) for checkin in checkins]

# Dashboard Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        return DashboardStats(
            total_members=0, active_members=0, today_checkins=0,
            current_checkedin=0, monthly_revenue=0, expiring_soon=0, total_plans=0
        )
    
    # Total members
    total_members = await db.members.count_documents({"gym_id": current_user.gym_id})
    
    # Active members
    active_members = await db.members.count_documents({
        "gym_id": current_user.gym_id,
        "membership_status": "active"
    })
    
    # Today's check-ins
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_checkins = await db.checkins.count_documents({
        "gym_id": current_user.gym_id,
        "check_in_time": {"$gte": today_start}
    })
    
    # Currently checked in
    current_checkedin = await db.checkins.count_documents({
        "gym_id": current_user.gym_id,
        "check_out_time": None
    })
    
    # Monthly revenue
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    payments = await db.payments.find({
        "gym_id": current_user.gym_id,
        "payment_date": {"$gte": month_start},
        "status": "paid"
    }).to_list(1000)
    
    monthly_revenue = sum(payment["amount"] for payment in payments)
    
    # Memberships expiring in next 7 days
    next_week = datetime.utcnow() + timedelta(days=7)
    expiring_soon = await db.members.count_documents({
        "gym_id": current_user.gym_id,
        "end_date": {"$lte": next_week},
        "membership_status": "active"
    })
    
    # Total plans
    total_plans = await db.plans.count_documents({
        "gym_id": current_user.gym_id,
        "is_active": True
    })
    
    return DashboardStats(
        total_members=total_members,
        active_members=active_members,
        today_checkins=today_checkins,
        current_checkedin=current_checkedin,
        monthly_revenue=monthly_revenue,
        expiring_soon=expiring_soon,
        total_plans=total_plans
    )

# Announcement Routes
@api_router.post("/announcements", response_model=Announcement)
async def create_announcement(announcement_data: AnnouncementCreate, current_user: User = Depends(get_current_owner)):
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    announcement = Announcement(
        **announcement_data.dict(),
        gym_id=current_user.gym_id,
        created_by=current_user.name
    )
    
    await db.announcements.insert_one(announcement.dict())
    return announcement

@api_router.get("/announcements", response_model=List[Announcement])
async def get_announcements(current_user: User = Depends(get_current_user)):
    if not current_user.gym_id:
        return []
    
    announcements = await db.announcements.find({
        "gym_id": current_user.gym_id,
        "is_active": True
    }).sort("created_at", -1).to_list(1000)
    
    return [Announcement(**announcement) for announcement in announcements]

# Member-specific routes for the mobile app
@api_router.get("/members/me", response_model=Member)
async def get_my_member_profile(current_user: User = Depends(get_current_user)):
    """Get current user's member profile"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    member = await db.members.find_one({"email": current_user.email, "gym_id": current_user.gym_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    return Member(**member)

@api_router.put("/members/me", response_model=Member)
async def update_my_member_profile(member_update: MemberUpdate, current_user: User = Depends(get_current_user)):
    """Update current user's member profile"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    # Only update non-None fields
    update_data = {k: v for k, v in member_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    result = await db.members.update_one(
        {"email": current_user.email, "gym_id": current_user.gym_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    # Also update user data if name or phone is changed
    user_update_data = {}
    if member_update.name:
        user_update_data["name"] = member_update.name
    if "phone" in update_data:
        user_update_data["phone"] = update_data["phone"]
    
    if user_update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": user_update_data}
        )
    
    updated_member = await db.members.find_one({"email": current_user.email, "gym_id": current_user.gym_id})
    return Member(**updated_member)

@api_router.get("/payments/me", response_model=List[Payment])
async def get_my_payments(current_user: User = Depends(get_current_user)):
    """Get current member's payment history"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    # First get the member record to get member_id
    member = await db.members.find_one({"email": current_user.email, "gym_id": current_user.gym_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    payments = await db.payments.find({
        "member_id": member["id"],
        "gym_id": current_user.gym_id
    }).sort("payment_date", -1).to_list(1000)
    
    return [Payment(**payment) for payment in payments]

@api_router.get("/announcements/me", response_model=List[Announcement])
async def get_my_announcements(current_user: User = Depends(get_current_user)):
    """Get announcements for current member's gym"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    if not current_user.gym_id:
        return []
    
    announcements = await db.announcements.find({
        "gym_id": current_user.gym_id,
        "is_active": True
    }).sort("created_at", -1).to_list(1000)
    
    return [Announcement(**announcement) for announcement in announcements]

@api_router.get("/members/me/stats")
async def get_my_member_stats(current_user: User = Depends(get_current_user)):
    """Get current member's stats (visits, membership status, etc.)"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    member = await db.members.find_one({"email": current_user.email, "gym_id": current_user.gym_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    # Get plan details
    plan = await db.plans.find_one({"id": member["plan_id"]})
    
    # Calculate days remaining
    end_date = member["end_date"]
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    days_remaining = (end_date - datetime.utcnow()).days
    
    return {
        "member_id": member["id"],
        "plan_name": plan["name"] if plan else "Unknown Plan",
        "plan_price": plan["price"] if plan else 0,
        "membership_status": member["membership_status"],
        "start_date": member["start_date"],
        "end_date": member["end_date"],
        "days_remaining": max(0, days_remaining),
        "total_visits": member["total_visits"],
        "last_visit": member.get("last_visit"),
        "auto_renewal": member["auto_renewal"]
    }

# Attendance Routes

@api_router.get("/attendance/qr-code", response_model=QRCodeResponse)
async def get_attendance_qr_code(current_user: User = Depends(get_current_owner_or_staff)):
    """Generate dynamic QR code for gym attendance"""
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    qr_data, qr_image, expires_at = generate_dynamic_qr_code(current_user.gym_id)
    
    return QRCodeResponse(
        qr_code_data=qr_data,
        qr_code_image=qr_image,
        expires_at=expires_at
    )

@api_router.post("/attendance/mark", response_model=AttendanceRecord)
async def mark_attendance(
    attendance_data: AttendanceMarkRequest, 
    current_user: User = Depends(get_current_user)
):
    """Mark attendance by scanning QR code (for members)"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can mark attendance")
    
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with member")
    
    # Validate QR code
    if not validate_qr_code(attendance_data.qr_code_data, current_user.gym_id):
        raise HTTPException(status_code=400, detail="Invalid or expired QR code")
    
    # Get member details
    member = await db.members.find_one({"email": current_user.email, "gym_id": current_user.gym_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member record not found")
    
    # Check if member is active
    if member["membership_status"] != "active":
        raise HTTPException(status_code=400, detail="Membership is not active")
    
    # Check if already checked in today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_attendance = await db.attendance.find_one({
        "member_id": member["id"],
        "check_in_time": {"$gte": today_start},
        "check_out_time": None
    })
    
    if existing_attendance:
        # Member is checking out
        check_out_time = datetime.utcnow()
        duration = int((check_out_time - existing_attendance["check_in_time"]).total_seconds() / 60)
        
        await db.attendance.update_one(
            {"id": existing_attendance["id"]},
            {
                "$set": {
                    "check_out_time": check_out_time,
                    "duration_minutes": duration
                }
            }
        )
        
        updated_record = await db.attendance.find_one({"id": existing_attendance["id"]})
        return AttendanceRecord(**updated_record)
    else:
        # Member is checking in
        attendance_record = AttendanceRecord(
            gym_id=current_user.gym_id,
            member_id=member["id"],
            member_name=member["name"],
            qr_code_data=attendance_data.qr_code_data,
            device_info=attendance_data.device_info
        )
        
        await db.attendance.insert_one(attendance_record.dict())
        
        # Update member's last visit and total visits
        await db.members.update_one(
            {"id": member["id"]},
            {
                "$set": {"last_visit": datetime.utcnow()},
                "$inc": {"total_visits": 1}
            }
        )
        
        return attendance_record

@api_router.get("/attendance/my-status")
async def get_my_attendance_status(current_user: User = Depends(get_current_user)):
    """Get current member's attendance status for today"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    member = await db.members.find_one({"email": current_user.email, "gym_id": current_user.gym_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member record not found")
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    attendance = await db.attendance.find_one({
        "member_id": member["id"],
        "check_in_time": {"$gte": today_start}
    })
    
    if not attendance:
        return {"status": "not_checked_in", "attendance": None}
    elif attendance.get("check_out_time"):
        # Convert to AttendanceRecord and then dict to handle serialization
        attendance_obj = AttendanceRecord(**attendance)
        return {"status": "checked_out", "attendance": attendance_obj.dict()}
    else:
        # Convert to AttendanceRecord and then dict to handle serialization
        attendance_obj = AttendanceRecord(**attendance)
        return {"status": "checked_in", "attendance": attendance_obj.dict()}

@api_router.get("/attendance/today", response_model=List[AttendanceRecord])
async def get_today_attendance(current_user: User = Depends(get_current_owner_or_staff)):
    """Get today's attendance for gym owners/staff"""
    if not current_user.gym_id:
        return []
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    attendances = await db.attendance.find({
        "gym_id": current_user.gym_id,
        "check_in_time": {"$gte": today_start}
    }).sort("check_in_time", -1).to_list(1000)
    
    return [AttendanceRecord(**attendance) for attendance in attendances]

@api_router.get("/attendance/stats/{days}", response_model=List[AttendanceStats])
async def get_attendance_stats(
    days: int = 30, 
    current_user: User = Depends(get_current_owner_or_staff)
):
    """Get attendance statistics for the last N days"""
    if not current_user.gym_id:
        return []
    
    if days > 90:  # Limit to 90 days max
        days = 90
    
    start_date = datetime.utcnow() - timedelta(days=days)
    attendances = await db.attendance.find({
        "gym_id": current_user.gym_id,
        "check_in_time": {"$gte": start_date}
    }).to_list(10000)
    
    # Group by date
    stats_by_date = {}
    for attendance in attendances:
        date_str = attendance["check_in_time"].strftime("%Y-%m-%d")
        if date_str not in stats_by_date:
            stats_by_date[date_str] = {
                "date": date_str,
                "total_attendance": 0,
                "unique_members": set(),
                "member_details": []
            }
        
        stats_by_date[date_str]["total_attendance"] += 1
        stats_by_date[date_str]["unique_members"].add(attendance["member_id"])
        stats_by_date[date_str]["member_details"].append({
            "member_name": attendance["member_name"],
            "check_in_time": attendance["check_in_time"],
            "check_out_time": attendance.get("check_out_time"),
            "duration_minutes": attendance.get("duration_minutes")
        })
    
    # Convert to response format
    result = []
    for date_str, stats in stats_by_date.items():
        result.append(AttendanceStats(
            date=date_str,
            total_attendance=stats["total_attendance"],
            unique_members=len(stats["unique_members"]),
            member_details=stats["member_details"]
        ))
    
    # Sort by date descending
    result.sort(key=lambda x: x.date, reverse=True)
    return result

@api_router.get("/attendance/calendar/{year}/{month}")
async def get_attendance_calendar(
    year: int, 
    month: int, 
    current_user: User = Depends(get_current_owner_or_staff)
):
    """Get attendance data for calendar view"""
    if not current_user.gym_id:
        return {"days": []}
    
    # Get first and last day of month
    first_day = datetime(year, month, 1)
    if month == 12:
        last_day = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = datetime(year, month + 1, 1) - timedelta(days=1)
    
    attendances = await db.attendance.find({
        "gym_id": current_user.gym_id,
        "check_in_time": {
            "$gte": first_day,
            "$lte": last_day.replace(hour=23, minute=59, second=59)
        }
    }).to_list(10000)
    
    # Group by day
    calendar_data = {}
    for attendance in attendances:
        day = attendance["check_in_time"].day
        if day not in calendar_data:
            calendar_data[day] = {
                "day": day,
                "total_attendance": 0,
                "unique_members": set(),
                "members": []
            }
        
        calendar_data[day]["total_attendance"] += 1
        calendar_data[day]["unique_members"].add(attendance["member_id"])
        calendar_data[day]["members"].append({
            "name": attendance["member_name"],
            "check_in_time": attendance["check_in_time"].strftime("%H:%M"),
            "duration": attendance.get("duration_minutes")
        })
    
    # Convert to list format
    days = []
    for day in range(1, last_day.day + 1):
        if day in calendar_data:
            data = calendar_data[day]
            days.append({
                "day": day,
                "total_attendance": data["total_attendance"],
                "unique_members": len(data["unique_members"]),
                "members": data["members"]
            })
        else:
            days.append({
                "day": day,
                "total_attendance": 0,
                "unique_members": 0,
                "members": []
            })
    
    return {
        "year": year,
        "month": month,
        "month_name": calendar.month_name[month],
        "days": days
    }

# Workout Template Routes
@api_router.post("/workout-templates", response_model=WorkoutTemplate)
async def create_workout_template(template_data: WorkoutTemplateCreate, current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    template = WorkoutTemplate(
        **template_data.dict(),
        gym_id=current_user.gym_id,
        created_by=current_user.name
    )
    
    await db.workout_templates.insert_one(template.dict())
    return template

@api_router.get("/workout-templates", response_model=List[WorkoutTemplate])
async def get_workout_templates(current_user: User = Depends(get_current_user)):
    if not current_user.gym_id:
        return []
    
    templates = await db.workout_templates.find({
        "gym_id": current_user.gym_id,
        "is_active": True
    }).sort("created_at", -1).to_list(1000)
    
    return [WorkoutTemplate(**template) for template in templates]

@api_router.get("/workout-templates/{template_id}", response_model=WorkoutTemplate)
async def get_workout_template(template_id: str, current_user: User = Depends(get_current_user)):
    template = await db.workout_templates.find_one({
        "id": template_id,
        "gym_id": current_user.gym_id
    })
    
    if not template:
        raise HTTPException(status_code=404, detail="Workout template not found")
    
    return WorkoutTemplate(**template)

@api_router.put("/workout-templates/{template_id}", response_model=WorkoutTemplate)
async def update_workout_template(template_id: str, template_update: WorkoutTemplateCreate, current_user: User = Depends(get_current_owner_or_staff)):
    template = await db.workout_templates.find_one({
        "id": template_id,
        "gym_id": current_user.gym_id
    })
    
    if not template:
        raise HTTPException(status_code=404, detail="Workout template not found")
    
    await db.workout_templates.update_one(
        {"id": template_id},
        {"$set": template_update.dict()}
    )
    
    updated_template = await db.workout_templates.find_one({"id": template_id})
    return WorkoutTemplate(**updated_template)

@api_router.delete("/workout-templates/{template_id}")
async def delete_workout_template(template_id: str, current_user: User = Depends(get_current_owner_or_staff)):
    await db.workout_templates.update_one(
        {"id": template_id, "gym_id": current_user.gym_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Workout template deleted successfully"}

# Diet Template Routes
@api_router.post("/diet-templates", response_model=DietTemplate)
async def create_diet_template(template_data: DietTemplateCreate, current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    template = DietTemplate(
        **template_data.dict(),
        gym_id=current_user.gym_id,
        created_by=current_user.name
    )
    
    await db.diet_templates.insert_one(template.dict())
    return template

@api_router.get("/diet-templates", response_model=List[DietTemplate])
async def get_diet_templates(current_user: User = Depends(get_current_user)):
    if not current_user.gym_id:
        return []
    
    templates = await db.diet_templates.find({
        "gym_id": current_user.gym_id,
        "is_active": True
    }).sort("created_at", -1).to_list(1000)
    
    return [DietTemplate(**template) for template in templates]

@api_router.get("/diet-templates/{template_id}", response_model=DietTemplate)
async def get_diet_template(template_id: str, current_user: User = Depends(get_current_user)):
    template = await db.diet_templates.find_one({
        "id": template_id,
        "gym_id": current_user.gym_id
    })
    
    if not template:
        raise HTTPException(status_code=404, detail="Diet template not found")
    
    return DietTemplate(**template)

@api_router.put("/diet-templates/{template_id}", response_model=DietTemplate)
async def update_diet_template(template_id: str, template_update: DietTemplateCreate, current_user: User = Depends(get_current_owner_or_staff)):
    template = await db.diet_templates.find_one({
        "id": template_id,
        "gym_id": current_user.gym_id
    })
    
    if not template:
        raise HTTPException(status_code=404, detail="Diet template not found")
    
    await db.diet_templates.update_one(
        {"id": template_id},
        {"$set": template_update.dict()}
    )
    
    updated_template = await db.diet_templates.find_one({"id": template_id})
    return DietTemplate(**updated_template)

@api_router.delete("/diet-templates/{template_id}")
async def delete_diet_template(template_id: str, current_user: User = Depends(get_current_owner_or_staff)):
    await db.diet_templates.update_one(
        {"id": template_id, "gym_id": current_user.gym_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Diet template deleted successfully"}

# Plan Assignment Routes
@api_router.post("/plan-assignments", response_model=MemberPlanAssignment)
async def assign_plan_to_member(assignment_data: PlanAssignmentCreate, current_user: User = Depends(get_current_owner_or_staff)):
    if not current_user.gym_id:
        raise HTTPException(status_code=400, detail="No gym associated with user")
    
    # Verify member exists
    member = await db.members.find_one({
        "id": assignment_data.member_id,
        "gym_id": current_user.gym_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get plan details based on type
    plan_name = ""
    if assignment_data.plan_type == "workout":
        plan = await db.workout_templates.find_one({
            "id": assignment_data.plan_id,
            "gym_id": current_user.gym_id
        })
        plan_name = plan["name"] if plan else "Unknown Workout"
    elif assignment_data.plan_type == "diet":
        plan = await db.diet_templates.find_one({
            "id": assignment_data.plan_id,
            "gym_id": current_user.gym_id
        })
        plan_name = plan["name"] if plan else "Unknown Diet"
    else:
        raise HTTPException(status_code=400, detail="Invalid plan type. Must be 'workout' or 'diet'")
    
    if not plan:
        raise HTTPException(status_code=404, detail=f"{assignment_data.plan_type.title()} plan not found")
    
    assignment = MemberPlanAssignment(
        gym_id=current_user.gym_id,
        member_id=assignment_data.member_id,
        member_name=member["name"],
        plan_type=assignment_data.plan_type,
        plan_id=assignment_data.plan_id,
        plan_name=plan_name,
        assigned_by=current_user.name,
        start_date=assignment_data.start_date or datetime.utcnow(),
        end_date=assignment_data.end_date,
        notes=assignment_data.notes
    )
    
    await db.plan_assignments.insert_one(assignment.dict())
    return assignment

@api_router.get("/plan-assignments/member/{member_id}", response_model=List[MemberPlanAssignment])
async def get_member_plan_assignments(member_id: str, current_user: User = Depends(get_current_user)):
    if not current_user.gym_id:
        return []
    
    # For members, they can only see their own assignments
    if current_user.role == UserRole.MEMBER:
        member = await db.members.find_one({
            "email": current_user.email,
            "gym_id": current_user.gym_id
        })
        if not member or member["id"] != member_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    assignments = await db.plan_assignments.find({
        "member_id": member_id,
        "gym_id": current_user.gym_id,
        "is_active": True
    }).sort("assigned_at", -1).to_list(1000)
    
    return [MemberPlanAssignment(**assignment) for assignment in assignments]

@api_router.get("/plan-assignments/my", response_model=List[MemberPlanAssignment])
async def get_my_plan_assignments(current_user: User = Depends(get_current_user)):
    """Get current member's plan assignments"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    member = await db.members.find_one({
        "email": current_user.email,
        "gym_id": current_user.gym_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    assignments = await db.plan_assignments.find({
        "member_id": member["id"],
        "gym_id": current_user.gym_id,
        "is_active": True
    }).sort("assigned_at", -1).to_list(1000)
    
    return [MemberPlanAssignment(**assignment) for assignment in assignments]

@api_router.delete("/plan-assignments/{assignment_id}")
async def remove_plan_assignment(assignment_id: str, current_user: User = Depends(get_current_owner_or_staff)):
    await db.plan_assignments.update_one(
        {"id": assignment_id, "gym_id": current_user.gym_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Plan assignment removed successfully"}

# Progress Tracking Routes
@api_router.post("/workout-progress", response_model=WorkoutProgress)
async def log_workout_progress(progress_data: WorkoutProgressCreate, current_user: User = Depends(get_current_user)):
    """Log workout progress for a member"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can log workout progress")
    
    # Get member details
    member = await db.members.find_one({
        "email": current_user.email,
        "gym_id": current_user.gym_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    # Verify assignment exists and belongs to this member
    assignment = await db.plan_assignments.find_one({
        "id": progress_data.assignment_id,
        "member_id": member["id"],
        "plan_type": "workout",
        "is_active": True
    })
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Workout assignment not found")
    
    # Get workout template details
    workout_template = await db.workout_templates.find_one({
        "id": assignment["plan_id"]
    })
    
    if not workout_template:
        raise HTTPException(status_code=404, detail="Workout template not found")
    
    progress = WorkoutProgress(
        gym_id=current_user.gym_id,
        member_id=member["id"],
        assignment_id=progress_data.assignment_id,
        workout_template_id=assignment["plan_id"],
        workout_name=assignment["plan_name"],
        scheduled_date=progress_data.scheduled_date,
        completed_at=datetime.utcnow() if progress_data.status == "completed" else None,
        duration_minutes=progress_data.duration_minutes,
        exercises_progress=progress_data.exercises_progress,
        overall_rating=progress_data.overall_rating,
        notes=progress_data.notes,
        status=progress_data.status
    )
    
    await db.workout_progress.insert_one(progress.dict())
    return progress

@api_router.post("/diet-progress", response_model=DietProgress)
async def log_diet_progress(progress_data: DietProgressCreate, current_user: User = Depends(get_current_user)):
    """Log diet progress for a member"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can log diet progress")
    
    # Get member details
    member = await db.members.find_one({
        "email": current_user.email,
        "gym_id": current_user.gym_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    # Verify assignment exists and belongs to this member
    assignment = await db.plan_assignments.find_one({
        "id": progress_data.assignment_id,
        "member_id": member["id"],
        "plan_type": "diet",
        "is_active": True
    })
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Diet assignment not found")
    
    # Get diet template details
    diet_template = await db.diet_templates.find_one({
        "id": assignment["plan_id"]
    })
    
    if not diet_template:
        raise HTTPException(status_code=404, detail="Diet template not found")
    
    progress = DietProgress(
        gym_id=current_user.gym_id,
        member_id=member["id"],
        assignment_id=progress_data.assignment_id,
        diet_template_id=assignment["plan_id"],
        diet_name=assignment["plan_name"],
        date=progress_data.date,
        meals_progress=progress_data.meals_progress,
        total_calories_consumed=progress_data.total_calories_consumed,
        water_intake_liters=progress_data.water_intake_liters,
        overall_rating=progress_data.overall_rating,
        notes=progress_data.notes,
        status="completed"
    )
    
    await db.diet_progress.insert_one(progress.dict())
    return progress

@api_router.get("/workout-progress/my", response_model=List[WorkoutProgress])
async def get_my_workout_progress(current_user: User = Depends(get_current_user)):
    """Get current member's workout progress"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    member = await db.members.find_one({
        "email": current_user.email,
        "gym_id": current_user.gym_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    progress_records = await db.workout_progress.find({
        "member_id": member["id"],
        "gym_id": current_user.gym_id
    }).sort("scheduled_date", -1).to_list(1000)
    
    return [WorkoutProgress(**record) for record in progress_records]

@api_router.get("/diet-progress/my", response_model=List[DietProgress])
async def get_my_diet_progress(current_user: User = Depends(get_current_user)):
    """Get current member's diet progress"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Only members can access this endpoint")
    
    member = await db.members.find_one({
        "email": current_user.email,
        "gym_id": current_user.gym_id
    })
    
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    
    progress_records = await db.diet_progress.find({
        "member_id": member["id"],
        "gym_id": current_user.gym_id
    }).sort("date", -1).to_list(1000)
    
    return [DietProgress(**record) for record in progress_records]

@api_router.get("/member-progress/{member_id}/workout", response_model=List[WorkoutProgress])
async def get_member_workout_progress(member_id: str, current_user: User = Depends(get_current_owner_or_staff)):
    """Get workout progress for a specific member (for gym owners/staff)"""
    if not current_user.gym_id:
        return []
    
    progress_records = await db.workout_progress.find({
        "member_id": member_id,
        "gym_id": current_user.gym_id
    }).sort("scheduled_date", -1).to_list(1000)
    
    return [WorkoutProgress(**record) for record in progress_records]

@api_router.get("/member-progress/{member_id}/diet", response_model=List[DietProgress])
async def get_member_diet_progress(member_id: str, current_user: User = Depends(get_current_owner_or_staff)):
    """Get diet progress for a specific member (for gym owners/staff)"""
    if not current_user.gym_id:
        return []
    
    progress_records = await db.diet_progress.find({
        "member_id": member_id,
        "gym_id": current_user.gym_id
    }).sort("date", -1).to_list(1000)
    
    return [DietProgress(**record) for record in progress_records]

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration - More secure setup
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React development server
    "http://127.0.0.1:3000",  # React development server alternative
    "https://3e760d43-d9ca-4437-987a-1318bb7e632c.preview.emergentagent.com",  # Current Frontend URL
    "https://2774af71-268d-4b92-b718-31567f0daf4d.preview.emergentagent.com",  # Previous Frontend URL
]

# Add environment variable for production origins
if os.environ.get('FRONTEND_URL'):
    ALLOWED_ORIGINS.append(os.environ.get('FRONTEND_URL'))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
