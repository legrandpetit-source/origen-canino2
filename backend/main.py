import os
import re
import json
import time
from collections import defaultdict
from threading import Lock
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Form, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import urllib.request
import urllib.parse
import urllib.error
from server_db import get_connection, init_database
from PIL import Image, UnidentifiedImageError, ImageOps
import io
import uuid
import random
from datetime import datetime, timedelta
import bcrypt
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from groq import Groq

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")

app = FastAPI(title="Origen Canino API")

# Mount uploads directory
# Asegurarnos de que el directorio de subidas exista
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Inicializar base de datos al arrancar
init_database()

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://origencanino.cl", "https://www.origencanino.cl"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Middleware de Seguridad HTTP (Hardening Defensivo) ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com; "
        "connect-src 'self' https: wss:; "
        "img-src 'self' https: data: blob:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "frame-src 'self' https://www.mercadopago.com https://sdk.mercadopago.com;"
    )
    response.headers["Server"] = "OrigenCanino-Protected-Gateway"
    return response

# --- Motor de Mitigación de Ataques y Rate Limiting en Memoria ---
class RateLimiter:
    def __init__(self):
        self._lock = Lock()
        self._records = defaultdict(list)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        with self._lock:
            cutoff = now - window_seconds
            self._records[key] = [t for t in self._records[key] if t > cutoff]
            if len(self._records[key]) >= max_requests:
                return True
            self._records[key].append(now)
            return False

rate_limiter = RateLimiter()

# --- Modelos Pydantic ---
class ProductResponse(BaseModel):
    id: int
    name: str
    type: str
    price: int
    weight: str
    description: str
    ingredients: List[str]
    benefits: List[str]
    image: str
    isNew: bool
    fixed_cost: int = 0

class ProductCreate(BaseModel):
    name: str
    type: str = "barf"
    price: int
    weight: str = "1 Kg"
    description: str = ""
    ingredients: List[str] = []
    benefits: List[str] = []
    isNew: bool = True
    image: str = ""
    fixed_cost: int = 0

class ProductUpdate(BaseModel):
    name: str
    type: Optional[str] = None
    price: int
    weight: str
    description: str
    ingredients: List[str]
    benefits: List[str]
    isNew: bool
    image: str
    fixed_cost: int = 0

class IngredientResponse(BaseModel):
    id: int
    name: str
    cost_per_unit: int
    unit: str
    kcal_per_100g: Optional[float] = 0
    protein_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    fiber_g: Optional[float] = 0
    moisture_g: Optional[float] = 0
    ash_g: Optional[float] = 0
    carbs_g: Optional[float] = 0

class IngredientCreateUpdate(BaseModel):
    name: str
    cost_per_unit: int
    unit: str
    kcal_per_100g: Optional[float] = 0
    protein_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    fiber_g: Optional[float] = 0
    moisture_g: Optional[float] = 0
    ash_g: Optional[float] = 0
    carbs_g: Optional[float] = 0

class EstimateNutritionRequest(BaseModel):
    ingredient_name: str

class RecipeItem(BaseModel):
    ingredient_id: int
    quantity: float

class RecipeUpdate(BaseModel):
    items: List[RecipeItem]

class BlogPostResponse(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: str
    content: str
    image: str
    created_at: str

class BlogPostCreateUpdate(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str
    image: str

class OrderItem(BaseModel):
    id: int
    name: str
    price: int
    quantity: int
    weight: Optional[str] = None

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    customer_city: str
    customer_region: str
    items: List[OrderItem]
    is_subscription: bool = False
    dog_name: Optional[str] = None
    dog_weight: Optional[float] = None
    dog_age: Optional[str] = None
    payment_method: Optional[str] = "transferencia"
    transfer_bank: Optional[str] = None
    transfer_receipt_number: Optional[str] = None
    nfc_building_code: Optional[str] = None
    discount_amount: Optional[int] = 0

class OrderStatusUpdate(BaseModel):
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None

class BuildingCreateUpdate(BaseModel):
    name: str
    slug: str
    address: str
    street_references: str
    discount_percent: int = 15
    contact_info: Optional[str] = None
    active: int = 1

class SettingsUpdate(BaseModel):
    settings: dict

class PromoSettingsUpdate(BaseModel):
    enabled: bool = True
    percent: int = 10
    code: str = "BIENVENIDO10"
    title: str = "¡10% OFF en tu primera compra!"
    description: Optional[str] = "Descuento automático exclusivo para nuevos clientes en su primer pedido."

class TestimonialCreate(BaseModel):
    owner_name: str
    dog_name: str
    content: str
    rating: int

class TestimonialStatusUpdate(BaseModel):
    status: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Verify2FARequest(BaseModel):
    session_id: str
    code: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class AdminUserCreate(BaseModel):
    email: str
    password: str

class AdminUserUpdate(BaseModel):
    email: str
    password: Optional[str] = None

class CustomerRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = "Región Metropolitana"
    dog_name: Optional[str] = None
    dog_weight: Optional[float] = None
    dog_age: Optional[str] = "adulto"

class CustomerLoginRequest(BaseModel):
    email: str
    password: str

class CustomerProfileUpdate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = "Región Metropolitana"

class CustomerDogCreateUpdate(BaseModel):
    name: str
    weight: float
    age_stage: Optional[str] = "adulto"
    favorite_diet: Optional[str] = None
    notes: Optional[str] = None

# --- Auth Config ---
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-origen")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        customer_id = payload.get("customer_id")
        if not customer_id:
            raise HTTPException(status_code=401, detail="Token no corresponde a un cliente")
        return customer_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# --- Endpoints Públicos ---
# --- Utilidades ---
def get_telegram_credentials():
    token = None
    chat_id = None
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
            rows = cursor.fetchall()
            for r in rows:
                k = r.get('key')
                v = (r.get('value') or '').strip()
                if k == 'telegram_bot_token' and v:
                    token = v
                elif k == 'telegram_chat_id' and v:
                    chat_id = v
    except Exception as e:
        print("Error obteniendo credenciales de Telegram desde BD:", e)

    if not token:
        if os.path.exists("backend/.env"):
            load_dotenv("backend/.env", override=True)
        elif os.path.exists(".env"):
            load_dotenv(".env", override=True)
        token = os.getenv("TELEGRAM_BOT_TOKEN") or "9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ"
        if token.startswith("8623970624"):
            token = "9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ"

    if not chat_id:
        chat_id = os.getenv("TELEGRAM_CHAT_ID") or "1468481915"

    return token.strip() if token else "", chat_id.strip() if chat_id else ""


def sync_telegram_to_env(bot_token: str, chat_id: str):
    env_paths = ["backend/.env", ".env"]
    for env_path in env_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    content = f.read()

                if "TELEGRAM_BOT_TOKEN=" in content:
                    content = re.sub(r"TELEGRAM_BOT_TOKEN=.*", f"TELEGRAM_BOT_TOKEN={bot_token}", content)
                else:
                    content += f"\nTELEGRAM_BOT_TOKEN={bot_token}"

                if "TELEGRAM_CHAT_ID=" in content:
                    content = re.sub(r"TELEGRAM_CHAT_ID=.*", f"TELEGRAM_CHAT_ID={chat_id}", content)
                else:
                    content += f"\nTELEGRAM_CHAT_ID={chat_id}"

                with open(env_path, "w", encoding="utf-8") as f:
                    f.write(content)
            except Exception as e:
                print(f"Error sincronizando Telegram a {env_path}: {e}")

    os.environ["TELEGRAM_BOT_TOKEN"] = bot_token
    os.environ["TELEGRAM_CHAT_ID"] = chat_id


def verify_telegram_bot_token(bot_token: str):
    if not bot_token:
        return {"ok": False, "error": "Token vacío"}
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("ok"):
                bot_result = data.get("result", {})
                return {
                    "ok": True,
                    "bot_id": bot_result.get("id"),
                    "first_name": bot_result.get("first_name"),
                    "username": bot_result.get("username"),
                }
            else:
                return {
                    "ok": False,
                    "error": data.get("description", "Token inválido o bot no encontrado")
                }
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode('utf-8'))
            return {"ok": False, "error": err_data.get("description", str(e))}
        except Exception:
            return {"ok": False, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def notify_telegram(message: str):
    token, chat_id = get_telegram_credentials()
    if not token or not chat_id:
        print("Credenciales de Telegram faltantes, omitiendo notificación.")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({'chat_id': chat_id, 'text': message, 'parse_mode': 'Markdown'}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            pass
    except Exception as e:
        print("Error enviando notificación a Telegram:", e)

def log_security_event(user_email: str, action: str, status: str = "success", ip_address: str = "127.0.0.1", details: str = ""):
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO admin_audit_logs (user_email, action, status, ip_address, details)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_email, action, status, ip_address or "127.0.0.1", details or ""))
            conn.commit()

        # Si el evento es anómalo o crítico, despachar alerta inmediata a Telegram
        if status in ["critical", "warning", "danger"]:
            emoji = "🚨" if status in ["critical", "danger"] else "⚠️"
            now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            telegram_alert = (
                f"{emoji} *ALERTA DE SEGURIDAD - ORIGEN CANINO*\n\n"
                f"🛡️ *Evento Anómalo:* {action}\n"
                f"📊 *Nivel de Severidad:* `{status.upper()}`\n"
                f"👤 *Identidad / Origen:* `{user_email or 'Anónimo'}`\n"
                f"🌐 *Dirección IP:* `{ip_address}`\n"
                f"📝 *Detalle Técnico:* {details}\n"
                f"⏰ *Fecha y Hora:* {now_str}"
            )
            try:
                notify_telegram(telegram_alert)
            except Exception as tg_err:
                print("Error enviando alerta de seguridad a Telegram:", tg_err)

    except Exception as e:
        print("Error logging security event:", e)

def get_client_ip(req: Request) -> str:
    forwarded = req.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return req.client.host if req.client else "127.0.0.1"

class ContactMessage(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str

# --- Endpoints Auth Admin ---
@app.post("/api/admin/login")
def login(request: LoginRequest, req: Request):
    ip = get_client_ip(req)
    clean_email = request.email.strip().lower()

    # Rate limiting defensivo contra fuerza bruta: máx 5 intentos por minuto por IP
    if rate_limiter.is_rate_limited(f"login_{ip}", max_requests=5, window_seconds=60):
        log_security_event(clean_email, "Bloqueo por exceso de intentos de login", status="critical", ip_address=ip, details="IP bloqueada temporalmente por 1 minuto")
        raise HTTPException(status_code=429, detail="Demasiados intentos de acceso. Por seguridad, espera 1 minuto.")

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM admin_users WHERE LOWER(email) = %s", (clean_email,))
            user = cursor.fetchone()
            if not user or not verify_password(request.password, user["password_hash"]):
                log_security_event(clean_email, "Intento de inicio de sesión fallido", status="warning", ip_address=ip, details="Credenciales incorrectas")
                raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
            
            session_id = str(uuid.uuid4())
            code = str(random.randint(10000, 99999))
            expires_at = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            
            cursor.execute("""
                INSERT INTO admin_2fa_codes (email, session_id, code, expires_at)
                VALUES (%s, %s, %s, %s)
            """, (user["email"], session_id, code, expires_at))
            conn.commit()
            
            msg = f"🔐 *Código de acceso admin Origen Canino*\n\nAlguien está intentando iniciar sesión desde `{ip}` con el usuario `{user['email']}`.\n\nTu código es: *{code}*"
            notify_telegram(msg)
            log_security_event(user["email"], "Código 2FA generado", status="info", ip_address=ip, details="Código enviado a Telegram @OrigenCanino_bot")
            
            return {"requires_2fa": True, "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/admin/verify-2fa")
def verify_2fa(request: Verify2FARequest, req: Request):
    ip = get_client_ip(req)

    # Protección de fuerza bruta: Máx 5 intentos para este session_id
    if rate_limiter.is_rate_limited(f"2fa_{request.session_id}", max_requests=5, window_seconds=300):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM admin_2fa_codes WHERE session_id = %s", (request.session_id,))
            conn.commit()
        log_security_event("Sistema", "Sesión 2FA destruida por fuerza bruta", status="critical", ip_address=ip, details=f"Sesión {request.session_id} invalidada")
        raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Tu código 2FA ha sido revocado por seguridad. Inicia sesión nuevamente.")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM admin_2fa_codes 
            WHERE session_id = %s AND code = %s
        """, (request.session_id, request.code))
        
        row = cursor.fetchone()
        if not row:
            log_security_event("Desconocido", "Código 2FA inválido", status="warning", ip_address=ip, details="Código incorrecto o sesión expirada")
            raise HTTPException(status_code=401, detail="Código inválido o sesión expirada")
            
        expires_at = row["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
            
        if datetime.utcnow() > expires_at:
            log_security_event(row["email"], "Código 2FA expirado", status="warning", ip_address=ip, details="Tiempo de 5 minutos excedido")
            raise HTTPException(status_code=401, detail="Código expirado")
            
        cursor.execute("DELETE FROM admin_2fa_codes WHERE session_id = %s", (request.session_id,))
        conn.commit()
        
        log_security_event(row["email"], "Inicio de sesión exitoso (2FA)", status="success", ip_address=ip, details="Acceso autorizado al panel de administración")
        access_token = create_access_token(data={"sub": row["email"]})
        return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/admin/change-password")
def change_password(request: ChangePasswordRequest, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
        
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin_users WHERE email = %s", (current_user,))
        user = cursor.fetchone()
        
        if not user or not verify_password(request.old_password, user["password_hash"]):
            log_security_event(current_user, "Intento fallido de cambio de contraseña", status="warning", ip_address=ip, details="Contraseña actual incorrecta")
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
            
        new_hash = get_password_hash(request.new_password)
        cursor.execute("UPDATE admin_users SET password_hash = %s WHERE email = %s", (new_hash, current_user))
        conn.commit()
        
        log_security_event(current_user, "Cambio de contraseña exitoso", status="success", ip_address=ip, details="Contraseña actualizada")
        notify_telegram(f"🔐 *Alerta de Seguridad*\n\nEl usuario `{current_user}` cambió su contraseña de acceso admin.")
        return {"success": True, "message": "Contraseña actualizada exitosamente"}

# --- Endpoints Panel de Seguridad Completo ---
@app.get("/api/admin/security/overview")
def get_security_overview(current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM admin_users")
        total_admins = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM admin_audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'")
        activity_24h = cursor.fetchone()["count"]
        
        token, chat_id = get_telegram_credentials()
        verification = verify_telegram_bot_token(token) if token else {"ok": False}
        bot_uname = f"@{verification.get('username')}" if verification.get("username") else "@OrigenCanino_bot"
        masked_token = f"{token[:8]}...{token[-4:]}" if len(token) > 12 else "***"
        
        return {
            "current_user": current_user,
            "total_admins": total_admins,
            "activity_24h": activity_24h,
            "telegram": {
                "active": bool(token and chat_id and verification.get("ok")),
                "bot_username": bot_uname,
                "masked_token": masked_token,
                "chat_id": chat_id,
                "verification": verification
            }
        }

@app.get("/api/admin/security/users")
def get_admin_users(current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, created_at FROM admin_users ORDER BY id ASC")
        users = cursor.fetchall()
        for u in users:
            if isinstance(u.get("created_at"), datetime):
                u["created_at"] = u["created_at"].strftime("%d/%m/%Y %H:%M")
        return users

@app.post("/api/admin/security/users")
def create_admin_user(request: AdminUserCreate, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    clean_email = request.email.strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="El correo o usuario no puede estar vacío")
        
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM admin_users WHERE LOWER(email) = %s", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email/nombre")
            
        pwd_hash = get_password_hash(request.password)
        cursor.execute("INSERT INTO admin_users (email, password_hash) VALUES (%s, %s) RETURNING id", (clean_email, pwd_hash))
        new_id = cursor.fetchone()["id"]
        conn.commit()
        
        log_security_event(current_user, f"Creación de usuario: {clean_email}", status="success", ip_address=ip, details="Nuevo administrador añadido")
        notify_telegram(f"👤 *Nuevo Administrador Creado*\n\nCreado por: `{current_user}`\nNuevo usuario: `{clean_email}`")
        return {"success": True, "message": "Usuario administrador creado", "id": new_id}

@app.put("/api/admin/security/users/{user_id}")
def update_admin_user(user_id: int, request: AdminUserUpdate, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    clean_email = request.email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email FROM admin_users WHERE id = %s", (user_id,))
        target = cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        if request.password and len(request.password) < 6:
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
            
        if request.password:
            pwd_hash = get_password_hash(request.password)
            cursor.execute("UPDATE admin_users SET email = %s, password_hash = %s WHERE id = %s", (clean_email, pwd_hash, user_id))
            log_security_event(current_user, f"Edición y reseteo de clave: {clean_email}", status="success", ip_address=ip)
            notify_telegram(f"🔑 *Contraseña Reseteada*\n\nUsuario modificado: `{clean_email}` por `{current_user}`")
        else:
            cursor.execute("UPDATE admin_users SET email = %s WHERE id = %s", (clean_email, user_id))
            log_security_event(current_user, f"Edición de usuario: {clean_email}", status="success", ip_address=ip)
            
        conn.commit()
        return {"success": True, "message": "Usuario actualizado exitosamente"}

@app.delete("/api/admin/security/users/{user_id}")
def delete_admin_user(user_id: int, req: Request, current_user: str = Depends(get_current_admin)):
    ip = get_client_ip(req)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM admin_users")
        total = cursor.fetchone()["count"]
        if total <= 1:
            raise HTTPException(status_code=400, detail="No puedes eliminar al único administrador del sistema")
            
        cursor.execute("SELECT id, email FROM admin_users WHERE id = %s", (user_id,))
        target = cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        cursor.execute("DELETE FROM admin_users WHERE id = %s", (user_id,))
        conn.commit()
        
        log_security_event(current_user, f"Eliminación de usuario: {target['email']}", status="warning", ip_address=ip, details="Administrador removido")
        notify_telegram(f"🗑️ *Administrador Eliminado*\n\nUsuario removido: `{target['email']}` por `{current_user}`")
        return {"success": True, "message": "Usuario eliminado"}

@app.get("/api/admin/security/logs")
def get_security_logs(limit: int = 50, current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_email, action, status, ip_address, details, created_at 
            FROM admin_audit_logs 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (limit,))
        logs = cursor.fetchall()
        for log in logs:
            if isinstance(log.get("created_at"), datetime):
                log["created_at"] = log["created_at"].strftime("%d/%m/%Y %H:%M:%S")
        return logs

@app.post("/api/admin/security/telegram-test")
def test_telegram_alert(current_user: str = Depends(get_current_admin)):
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    msg = f"🔔 *Prueba de Alerta de Seguridad*\n\nConexión exitosa verificada por `{current_user}`.\nFecha: {now_str}\nEstado: ✅ Todo operativo"
    notify_telegram(msg)
    return {"success": True, "message": "Alerta de prueba enviada a Telegram"}


@app.get("/api/admin/telegram-settings")
def get_admin_telegram_settings(current_user: str = Depends(get_current_admin)):
    token, chat_id = get_telegram_credentials()
    verification = verify_telegram_bot_token(token) if token else {"ok": False, "error": "Token no configurado"}
    return {
        "bot_token": token,
        "chat_id": chat_id,
        "is_configured": bool(token and chat_id),
        "verification": verification
    }


@app.post("/api/admin/telegram-settings")
def update_admin_telegram_settings(payload: dict, current_user: str = Depends(get_current_admin)):
    bot_token = (payload.get("bot_token") or "").strip()
    chat_id = (payload.get("chat_id") or "").strip()

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('telegram_bot_token', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (bot_token,))
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('telegram_chat_id', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (chat_id,))
            conn.commit()

        sync_telegram_to_env(bot_token, chat_id)
        verification = verify_telegram_bot_token(bot_token) if bot_token else {"ok": False, "error": "Token vacío"}

        log_security_event(current_user, "Actualización credenciales Telegram", "success", details=f"Chat ID: {chat_id}")

        return {
            "success": True,
            "message": "Credenciales de Telegram guardadas correctamente",
            "bot_token": bot_token,
            "chat_id": chat_id,
            "verification": verification
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/telegram-test")
def test_admin_telegram_settings(payload: dict = None, current_user: str = Depends(get_current_admin)):
    bot_token, chat_id = get_telegram_credentials()
    if not bot_token or not chat_id:
        raise HTTPException(
            status_code=400,
            detail="Debe configurar tanto el Bot Token como el Chat ID antes de enviar una prueba."
        )

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    custom_text = (payload or {}).get("message")
    if not custom_text:
        text = (
            "🐶 *¡Prueba de Telegram Exitosa en Origen Canino!*\n\n"
            f"Conexión verificada por `{current_user}` el {now_str}.\n\n"
            "✅ Códigos 2FA para inicio de sesión en panel\n"
            "✅ Notificaciones de nuevos pedidos de comida BARF\n"
            "✅ Confirmaciones de pagos aprobados en Mercado Pago\n"
            "✅ Alertas de seguridad del sistema"
        )
    else:
        text = custom_text

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = urllib.parse.urlencode({'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown'}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            if res_body.get("ok"):
                return {
                    "success": True,
                    "message": f"¡Mensaje de prueba recibido con éxito en el chat {chat_id}!"
                }
            else:
                desc = res_body.get("description", "Error desconocido de Telegram")
                return {"success": False, "error": desc, "message": f"Telegram rechazó el envío: {desc}"}
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode('utf-8'))
            desc = err_data.get("description", str(e))
            return {"success": False, "error": desc, "message": f"Telegram rechazó el envío: {desc}"}
        except Exception:
            return {"success": False, "error": str(e), "message": f"Error HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Error de conexión con Telegram: {str(e)}"
        }

# ==========================================
# --- PORTAL DE CLIENTES & MASCOTAS ---
# ==========================================

@app.post("/api/customer/register")
def customer_register(req: CustomerRegisterRequest):
    clean_email = req.email.strip().lower()
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if not clean_email or not req.name.strip():
        raise HTTPException(status_code=400, detail="Nombre y correo son obligatorios")
        
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM customers WHERE LOWER(email) = %s", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Ya existe una cuenta con este correo electrónico. Inicia sesión.")
            
        pwd_hash = get_password_hash(req.password)
        cursor.execute("""
            INSERT INTO customers (name, email, password_hash, phone, address, city, region)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, email, phone, address, city, region, created_at
        """, (req.name.strip(), clean_email, pwd_hash, req.phone, req.address, req.city, req.region or "Región Metropolitana"))
        
        customer = cursor.fetchone()
        customer_id = customer["id"]
        
        # Guardar perrito si fue ingresado
        dogs = []
        if req.dog_name and req.dog_weight:
            cursor.execute("""
                INSERT INTO customer_dogs (customer_id, name, weight, age_stage)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, weight, age_stage
            """, (customer_id, req.dog_name.strip(), req.dog_weight, req.dog_age or "adulto"))
            dog_row = cursor.fetchone()
            if dog_row and "weight" in dog_row and dog_row["weight"] is not None:
                dog_row["weight"] = float(dog_row["weight"])
            dogs.append(dog_row)
            
        conn.commit()
        
        token = create_access_token(data={"customer_id": customer_id, "sub": clean_email, "type": "customer"})
        if isinstance(customer.get("created_at"), datetime):
            customer["created_at"] = customer["created_at"].isoformat()
            
        return {
            "access_token": token,
            "token_type": "bearer",
            "customer": customer,
            "dogs": dogs
        }

@app.post("/api/customer/login")
def customer_login(req: CustomerLoginRequest):
    clean_email = req.email.strip().lower()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE LOWER(email) = %s", (clean_email,))
        customer = cursor.fetchone()
        if not customer or not verify_password(req.password, customer["password_hash"]):
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
            
        customer_id = customer["id"]
        cursor.execute("SELECT id, name, weight, age_stage, favorite_diet, notes FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC", (customer_id,))
        dogs = cursor.fetchall()
        for d in dogs:
            if "weight" in d and d["weight"] is not None:
                d["weight"] = float(d["weight"])
                
        token = create_access_token(data={"customer_id": customer_id, "sub": clean_email, "type": "customer"})
        
        customer.pop("password_hash", None)
        if isinstance(customer.get("created_at"), datetime):
            customer["created_at"] = customer["created_at"].isoformat()
        if isinstance(customer.get("updated_at"), datetime):
            customer["updated_at"] = customer["updated_at"].isoformat()
            
        return {
            "access_token": token,
            "token_type": "bearer",
            "customer": customer,
            "dogs": dogs
        }

@app.get("/api/customer/me")
def get_customer_profile(customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, phone, address, city, region, created_at FROM customers WHERE id = %s", (customer_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
            
        cursor.execute("SELECT id, name, weight, age_stage, favorite_diet, notes FROM customer_dogs WHERE customer_id = %s ORDER BY id ASC", (customer_id,))
        dogs = cursor.fetchall()
        for d in dogs:
            if "weight" in d and d["weight"] is not None:
                d["weight"] = float(d["weight"])
                
        if isinstance(customer.get("created_at"), datetime):
            customer["created_at"] = customer["created_at"].strftime("%d/%m/%Y")
            
        return {
            "customer": customer,
            "dogs": dogs
        }

@app.put("/api/customer/profile")
def update_customer_profile(req: CustomerProfileUpdate, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE customers 
            SET name = %s, phone = %s, address = %s, city = %s, region = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, name, email, phone, address, city, region
        """, (req.name.strip(), req.phone, req.address, req.city, req.region, customer_id))
        updated = cursor.fetchone()
        conn.commit()
        return {"success": True, "customer": updated}

@app.post("/api/customer/dogs")
def add_customer_dog(dog: CustomerDogCreateUpdate, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO customer_dogs (customer_id, name, weight, age_stage, favorite_diet, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, name, weight, age_stage, favorite_diet, notes
        """, (customer_id, dog.name.strip(), dog.weight, dog.age_stage or "adulto", dog.favorite_diet, dog.notes))
        new_dog = cursor.fetchone()
        if "weight" in new_dog and new_dog["weight"] is not None:
            new_dog["weight"] = float(new_dog["weight"])
        conn.commit()
        return {"success": True, "dog": new_dog}

@app.put("/api/customer/dogs/{dog_id}")
def update_customer_dog(dog_id: int, dog: CustomerDogCreateUpdate, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE customer_dogs 
            SET name = %s, weight = %s, age_stage = %s, favorite_diet = %s, notes = %s
            WHERE id = %s AND customer_id = %s
            RETURNING id, name, weight, age_stage, favorite_diet, notes
        """, (dog.name.strip(), dog.weight, dog.age_stage or "adulto", dog.favorite_diet, dog.notes, dog_id, customer_id))
        updated_dog = cursor.fetchone()
        if not updated_dog:
            raise HTTPException(status_code=404, detail="Perrito no encontrado")
        if "weight" in updated_dog and updated_dog["weight"] is not None:
            updated_dog["weight"] = float(updated_dog["weight"])
        conn.commit()
        return {"success": True, "dog": updated_dog}

@app.delete("/api/customer/dogs/{dog_id}")
def delete_customer_dog(dog_id: int, customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM customer_dogs WHERE id = %s AND customer_id = %s", (dog_id, customer_id))
        conn.commit()
        return {"success": True, "message": "Perrito eliminado"}

@app.get("/api/customer/orders")
def get_customer_orders(customer_id: int = Depends(get_current_customer)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM customers WHERE id = %s", (customer_id,))
        cust = cursor.fetchone()
        cust_email = cust["email"] if cust else ""
        
        cursor.execute("""
            SELECT id, total, subtotal, shipping_cost, payment_status, delivery_status, 
                   payment_method, dog_name, dog_weight, is_subscription, created_at
            FROM orders 
            WHERE customer_id = %s OR LOWER(customer_email) = %s
            ORDER BY id DESC
        """, (customer_id, cust_email.lower()))
        orders = cursor.fetchall()
        
        for o in orders:
            if isinstance(o.get("created_at"), datetime):
                o["created_at"] = o["created_at"].strftime("%d/%m/%Y %H:%M")
            cursor.execute("""
                SELECT oi.product_id, oi.product_name, oi.quantity, oi.price_at_purchase as price, p.weight 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = %s
            """, (o["id"],))
            o["items"] = cursor.fetchall()
            
        return orders

# --- Endpoints ---
@app.get("/api/products", response_model=List[ProductResponse])
def get_products():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE active = 1 ORDER BY id ASC")
        rows = cursor.fetchall()
        
        products = []
        for row in rows:
            products.append(ProductResponse(
                id=row["id"],
                name=row["name"],
                type=row["type"],
                price=row["price"],
                weight=row["weight"],
                description=row["description"],
                ingredients=json.loads(row["ingredients"]),
                benefits=json.loads(row["benefits"]),
                image=row["image"],
                isNew=bool(row["is_new"]),
                fixed_cost=row.get("fixed_cost", 0)
            ))
        return products

@app.post("/api/products")
def create_product(p: ProductCreate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO products (
                    name, type, price, weight, description, 
                    ingredients, benefits, is_new, active, image, fixed_cost
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s, %s)
                RETURNING id
            """, (
                p.name, p.type, p.price, p.weight, p.description,
                json.dumps(p.ingredients), json.dumps(p.benefits),
                int(p.isNew), p.image, p.fixed_cost
            ))
            new_id = cursor.fetchone()["id"]
            conn.commit()
            return {"success": True, "id": new_id, "message": "Producto creado exitosamente."}
    except Exception as e:
        print(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail="Error creando el producto: " + str(e))

@app.put("/api/products/{product_id}")
def update_product(product_id: int, p: ProductUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                UPDATE products 
                SET name = %s, type = COALESCE(%s, type), price = %s, weight = %s, description = %s, ingredients = %s, benefits = %s, is_new = %s, image = %s, fixed_cost = %s
                WHERE id = %s
            """, (p.name, p.type, p.price, p.weight, p.description, json.dumps(p.ingredients), json.dumps(p.benefits), int(p.isNew), p.image, p.fixed_cost, product_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        print(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando el producto.")

@app.post("/api/admin/products/upload-image")
async def upload_product_image(file: UploadFile = File(...), current_user: str = Depends(get_current_admin)):
    try:
        # Validación de tipo de archivo
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        # Límite estricto de tamaño a 10 MB para prevenir DoS por memoria
        MAX_UPLOAD_SIZE = 10 * 1024 * 1024
        content = await file.read(MAX_UPLOAD_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="La imagen excede el límite permitido de 10 MB.")

        orig_size_bytes = len(content)
        Image.MAX_IMAGE_PIXELS = 30_000_000  # Protección contra descompresiones masivas (Decompression Bombs)
        image = Image.open(io.BytesIO(content))
        
        # 1. Corregir orientación EXIF (típica en fotos de móviles)
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # 2. Normalizar modos de color preservando canales y transparencia en WebP
        if image.mode in ("P", "LA"):
            image = image.convert("RGBA")
        elif image.mode == "CMYK":
            image = image.convert("RGB")
        elif image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGB")

        # 3. Redimensionar inteligentemente si supera dimensiones de producto web (máx 1200x1200px)
        max_dim = 1200
        w, h = image.size
        if w > max_dim or h > max_dim:
            image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # 4. Generar nombre único .webp y guardar comprimido
        filename = f"{uuid.uuid4().hex}.webp"
        upload_dir = os.path.join("uploads", "products")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)

        # WebP de alta eficiencia: method=6 maximiza compresión manteniendo calidad visual
        image.save(
            filepath,
            "WEBP",
            quality=82,
            method=6,
            optimize=True
        )

        final_size_bytes = os.path.getsize(filepath)
        final_w, final_h = image.size

        return {
            "success": True,
            "url": f"/uploads/products/{filename}",
            "filename": filename,
            "original_size": orig_size_bytes,
            "final_size": final_size_bytes,
            "saved_bytes": max(0, orig_size_bytes - final_size_bytes),
            "width": final_w,
            "height": final_h,
            "format": "webp"
        }
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="El archivo subido no es una imagen válida.")
    except Exception as e:
        print(f"Error uploading product image: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando la imagen: {str(e)}")

# --- Endpoints Ingredientes (Inventario) ---
@app.get("/api/admin/ingredients", response_model=List[IngredientResponse])
def get_ingredients(current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ingredients ORDER BY name ASC")
        return [dict(r) for r in cursor.fetchall()]

@app.post("/api/admin/ingredients")
def create_ingredient(i: IngredientCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        print(f"DEBUG create_ingredient: payload={i.model_dump()}")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ingredients (
                    name, cost_per_unit, unit, 
                    kcal_per_100g, protein_g, fat_g, fiber_g, moisture_g, ash_g, carbs_g
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                i.name, i.cost_per_unit, i.unit,
                i.kcal_per_100g, i.protein_g, i.fat_g, i.fiber_g, i.moisture_g, i.ash_g, i.carbs_g
            ))
            conn.commit()
            print("DEBUG create_ingredient: commit successful")
            return {"success": True, "id": cursor.fetchone()["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando ingrediente")

@app.put("/api/admin/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: int, i: IngredientCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        print(f"DEBUG update_ingredient ID {ingredient_id}: payload={i.model_dump()}")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE ingredients 
                SET name = %s, cost_per_unit = %s, unit = %s,
                    kcal_per_100g = %s, protein_g = %s, fat_g = %s, fiber_g = %s, moisture_g = %s, ash_g = %s, carbs_g = %s
                WHERE id = %s
            """, (
                i.name, i.cost_per_unit, i.unit,
                i.kcal_per_100g, i.protein_g, i.fat_g, i.fiber_g, i.moisture_g, i.ash_g, i.carbs_g,
                ingredient_id
            ))
            conn.commit()
            print("DEBUG update_ingredient: commit successful")
            return {"success": True}
    except Exception as e:
        print(f"DEBUG update_ingredient: exception {e}")
        raise HTTPException(status_code=500, detail="Error actualizando ingrediente")

@app.delete("/api/admin/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ingredients WHERE id = %s", (ingredient_id,))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando ingrediente")

@app.post("/api/ingredients/estimate-nutrition")
def estimate_nutrition(req: EstimateNutritionRequest, current_user: str = Depends(get_current_admin)):
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Groq API Key no configurada en el servidor.")
    
    prompt = f"""
    Eres un experto en nutrición animal y de ingredientes. Estima los valores nutricionales promedio por cada 100g para el ingrediente: "{req.ingredient_name}".
    Debes devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura (usa números flotantes sin unidades, 0 si no aplica o es mínimo):
    {{
      "kcal_per_100g": 0.0,
      "protein_g": 0.0,
      "fat_g": 0.0,
      "fiber_g": 0.0,
      "moisture_g": 0.0,
      "ash_g": 0.0,
      "carbs_g": 0.0
    }}
    No devuelvas ningún otro texto, markdown, ni explicaciones. Solo el JSON.
    """
    try:
        client = Groq(api_key=groq_api_key)
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="qwen/qwen3.8-27b",
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        text = response.choices[0].message.content.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        data = json.loads(text.strip())
        return data
    except Exception as e:
        print(f"Error AI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error consultando la IA (Groq): {str(e)}")

# --- Endpoints Recetas ---
@app.get("/api/admin/products/{product_id}/recipe")
def get_recipe(product_id: int, current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT pi.ingredient_id, pi.quantity, i.name, i.cost_per_unit, i.unit 
            FROM product_ingredients pi
            JOIN ingredients i ON pi.ingredient_id = i.id
            WHERE pi.product_id = %s
        """, (product_id,))
        return [dict(r) for r in cursor.fetchall()]

@app.put("/api/admin/products/{product_id}/recipe")
def update_recipe(product_id: int, r: RecipeUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            # Eliminar la receta anterior
            cursor.execute("DELETE FROM product_ingredients WHERE product_id = %s", (product_id,))
            
            # Insertar la nueva receta
            for item in r.items:
                cursor.execute("""
                    INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
                    VALUES (%s, %s, %s)
                """, (product_id, item.ingredient_id, item.quantity))
            
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando receta")

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE products SET active = 0 WHERE id = %s", (product_id,))
            conn.commit()
        return {"success": True, "message": "Producto eliminado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando el producto.")

# --- Endpoints Blog ---
@app.post("/api/admin/blog/upload-image")
async def upload_blog_image(file: UploadFile = File(...), current_user: str = Depends(get_current_admin)):
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida.")

        MAX_UPLOAD_SIZE = 12 * 1024 * 1024
        content = await file.read(MAX_UPLOAD_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="La imagen excede el límite permitido de 12 MB.")

        orig_size_bytes = len(content)
        Image.MAX_IMAGE_PIXELS = 35_000_000
        image = Image.open(io.BytesIO(content))

        # 1. Corregir orientación EXIF (típica en fotos de móviles)
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # 2. Normalizar modos de color para WebP
        if image.mode in ("P", "LA"):
            image = image.convert("RGBA")
        elif image.mode == "CMYK":
            image = image.convert("RGB")
        elif image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGB")

        # 3. Redimensionar para cabecera editorial de Blog (máx 1400px ancho)
        max_w = 1400
        w, h = image.size
        if w > max_w:
            new_h = int(h * (max_w / w))
            image = image.resize((max_w, new_h), Image.Resampling.LANCZOS)

        # 4. Generar nombre único .webp y guardar comprimido
        filename = f"blog_{uuid.uuid4().hex[:12]}.webp"
        upload_dir = os.path.join("uploads", "blog")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)

        image.save(
            filepath,
            "WEBP",
            quality=84,
            method=6,
            optimize=True
        )

        final_size_bytes = os.path.getsize(filepath)
        final_w, final_h = image.size

        return {
            "success": True,
            "url": f"/uploads/blog/{filename}",
            "filename": filename,
            "original_size": orig_size_bytes,
            "final_size": final_size_bytes,
            "saved_bytes": max(0, orig_size_bytes - final_size_bytes),
            "width": final_w,
            "height": final_h,
            "format": "webp"
        }
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Formato de imagen corrupto o no reconocido.")
    except Exception as e:
        print(f"Error subiendo imagen de blog: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen del blog: {str(e)}")

@app.get("/api/blog", response_model=List[BlogPostResponse])
def get_blog_posts():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blog_posts WHERE active = 1 ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [BlogPostResponse(
            id=row["id"],
            slug=row["slug"],
            title=row["title"],
            excerpt=row["excerpt"],
            content=row["content"],
            image=row["image"],
            created_at=row["created_at"].isoformat() if hasattr(row["created_at"], 'isoformat') else str(row["created_at"])
        ) for row in rows]

@app.get("/api/blog/{slug}", response_model=BlogPostResponse)
def get_blog_post_by_slug(slug: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blog_posts WHERE slug = %s AND active = 1", (slug,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Artículo no encontrado")
        return BlogPostResponse(
            id=row["id"],
            slug=row["slug"],
            title=row["title"],
            excerpt=row["excerpt"],
            content=row["content"],
            image=row["image"],
            created_at=row["created_at"].isoformat() if hasattr(row["created_at"], 'isoformat') else str(row["created_at"])
        )

@app.post("/api/blog")
def create_blog_post(p: BlogPostCreateUpdate):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                INSERT INTO blog_posts (slug, title, excerpt, content, image)
                VALUES (%s, %s, %s, %s, %s)
            """, (p.slug, p.title, p.excerpt, p.content, p.image))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando el artículo.")

@app.put("/api/blog/{post_id}")
def update_blog_post(post_id: int, p: BlogPostCreateUpdate):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                UPDATE blog_posts 
                SET slug = %s, title = %s, excerpt = %s, content = %s, image = %s
                WHERE id = %s
            """, (p.slug, p.title, p.excerpt, p.content, p.image, post_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando el artículo.")

@app.delete("/api/blog/{post_id}")
def delete_blog_post(post_id: int):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE blog_posts SET active = 0 WHERE id = %s", (post_id,))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando el artículo.")

from fastapi.responses import Response

@app.get("/sitemap.xml")
def generate_sitemap():
    # Obtener todos los blogs para el sitemap
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT slug FROM blog_posts WHERE active = 1")
        rows = cursor.fetchall()
        
    xml_content = '<?xml version="1.0" encoding="UTF-8"%s>\\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n'
    
    base_url = "https://origencanino.cl"
    
    # Static routes
    static_routes = ["/", "/admin"]
    for route in static_routes:
        xml_content += f"  <url>\\n    <loc>{base_url}{route}</loc>\\n  </url>\\n"
        
    # Dynamic blog routes
    for row in rows:
        xml_content += f"  <url>\\n    <loc>{base_url}/blog/{row['slug']}</loc>\\n  </url>\\n"
        
    xml_content += "</urlset>"
    
    return Response(content=xml_content, media_type="application/xml")

@app.post("/api/contact")
def submit_contact(msg: ContactMessage):
    try:
        with get_connection() as conn:
            conn.cursor().execute(
                "INSERT INTO contact_messages (name, email, phone, message) VALUES (%s, %s, %s, %s)",
                (msg.name, msg.email, msg.phone, msg.message)
            )
            conn.commit()
        return {"success": True, "message": "Mensaje recibido correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al guardar el mensaje.")

# --- Orders Endpoints ---
MIN_PURCHASE_AMOUNT = 30000

@app.post("/api/orders")
def create_order(order: OrderCreate, req: Request):
    ip = get_client_ip(req)
    # Límite anti-spam: máximo 10 pedidos cada 5 minutos por IP
    if rate_limiter.is_rate_limited(f"orders_{ip}", max_requests=10, window_seconds=300):
        log_security_event(order.customer_email or "Anónimo", "Bloqueo por exceso de pedidos (Flood/Spam)", status="warning", ip_address=ip, details="Límite de 10 pedidos cada 5 minutos excedido")
        raise HTTPException(status_code=429, detail="Has alcanzado el límite de creación de pedidos. Por favor espera unos minutos.")

    # Sanitización de longitudes de campo
    order.customer_name = order.customer_name.strip()[:150]
    order.customer_email = order.customer_email.strip().lower()[:150]
    order.customer_phone = order.customer_phone.strip()[:50]
    order.customer_address = order.customer_address.strip()[:250]
    order.customer_city = order.customer_city.strip()[:100]

    subtotal = sum(item.price * item.quantity for item in order.items)
    if subtotal < MIN_PURCHASE_AMOUNT:
        raise HTTPException(
            status_code=400, 
            detail=f"El monto mínimo de compra es de ${MIN_PURCHASE_AMOUNT:,} CLP. Tu subtotal actual es de ${subtotal:,} CLP."
        )
    discount = order.discount_amount or 0
    subtotal_after_discount = max(0, subtotal - discount)
    
    # Envío gratis si es suscripción, de lo contrario $5000 si es menor a $100.000
    if order.is_subscription:
        shipping_cost = 0
    else:
        shipping_cost = 5000 if subtotal_after_discount < 100000 else 0
        
    total = subtotal_after_discount + shipping_cost

    initial_payment_status = "Pendiente (Mercado Pago)" if order.payment_method == "mercadopago" else "Pendiente (Transferencia)"

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Buscar si el cliente ya está registrado por email
            cursor.execute("SELECT id FROM customers WHERE LOWER(email) = %s", (order.customer_email.strip().lower(),))
            c_row = cursor.fetchone()
            linked_customer_id = c_row['id'] if c_row else None

            cursor.execute("""
                INSERT INTO orders (
                    customer_name, customer_email, customer_phone, customer_address, 
                    customer_city, customer_region, subtotal, shipping_cost, total, 
                    is_subscription, dog_name, dog_weight, dog_age, payment_method, 
                    transfer_bank, transfer_receipt_number, nfc_building_code, 
                    discount_amount, payment_status, customer_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
            """, (
                order.customer_name, order.customer_email, order.customer_phone, order.customer_address, 
                order.customer_city, order.customer_region, subtotal, shipping_cost, total, 
                int(order.is_subscription), order.dog_name, order.dog_weight, order.dog_age,
                order.payment_method or 'transferencia', order.transfer_bank, order.transfer_receipt_number,
                order.nfc_building_code, discount, initial_payment_status, linked_customer_id
            ))
            
            order_id = cursor.fetchone()['id']
            
            # Si el cliente existe y trajo datos de perrito, auto-guardar si no lo tiene
            if linked_customer_id and order.dog_name and order.dog_weight:
                try:
                    cursor.execute("""
                        SELECT id FROM customer_dogs 
                        WHERE customer_id = %s AND LOWER(name) = %s
                    """, (linked_customer_id, order.dog_name.strip().lower()))
                    if not cursor.fetchone():
                        cursor.execute("""
                            INSERT INTO customer_dogs (customer_id, name, weight, age_stage)
                            VALUES (%s, %s, %s, %s)
                        """, (linked_customer_id, order.dog_name.strip(), float(order.dog_weight), order.dog_age or 'adulto'))
                except Exception as e_dog:
                    print("Error auto-saving dog for customer:", e_dog)
            
            for item in order.items:
                cursor.execute("""
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
                    VALUES (%s, %s, %s, %s, %s)
                """, (order_id, item.id, item.name, item.quantity, item.price))
            
            # Si provino de un NFC de edificio, registrar visita/orden
            if order.nfc_building_code:
                cursor.execute("UPDATE nfc_buildings SET visits_count = visits_count + 1 WHERE slug = %s", (order.nfc_building_code,))

            # Manejo de estados y alertas de Telegram según método de pago:
            # 1. MERCADO PAGO: No notificar como venta hasta que el webhook confirme el pago real aprobado
            if order.payment_method == 'mercadopago':
                cursor.execute("UPDATE orders SET payment_status = 'Iniciado (Esperando Pago)' WHERE id = %s", (order_id,))
                conn.commit()
                # NOTA: NO enviamos notificación a Telegram aquí. Se enviará únicamente cuando Mercado Pago confirme el pago aprobado.
            else:
                # 2. TRANSFERENCIA BANCARIA: Notificar como solicitud pendiente de validar comprobante
                cursor.execute("UPDATE orders SET payment_status = 'Pendiente de Transferencia' WHERE id = %s", (order_id,))
                conn.commit()

                msg = f"📋 ¡Nueva Solicitud de Pedido por Transferencia! (#{order_id})\n\n"
                if order.is_subscription:
                    msg = f"🔄 ¡SOLICITUD DE SUSCRIPCIÓN (Transferencia)! (#{order_id})\n\n"
                    
                msg += "⚠️ ESTADO: PENDIENTE DE PAGO (Validar transferencia antes de despachar)\n\n"
                msg += f"👤 Cliente: {order.customer_name}\n"
                msg += f"📞 Teléfono: {order.customer_phone}\n"
                msg += f"📍 Dirección: {order.customer_address}, {order.customer_city}\n"
                msg += f"🏦 Banco: {order.transfer_bank or 'Sin registrar'} | N° Operación: {order.transfer_receipt_number or 'Pendiente'}\n"

                if order.nfc_building_code:
                    msg += f"🏢 Tag NFC Comunidad: {order.nfc_building_code} (Descuento: -${discount:,})\n"
                elif discount > 0:
                    msg += f"🎉 Descuento 1ra Compra: -${discount:,}\n"

                msg += f"💰 Total a Transferir: ${total:,}\n\n"
                
                if order.is_subscription:
                    msg += "⚠️ Importante: Es suscripción por transferencia. Coordinar con el cliente cada mes.\n\n"
                    
                msg += "👉 Revisa tu cuenta bancaria para confirmar la recepción del dinero."
                notify_telegram(msg)
            
            return {"success": True, "order_id": order_id, "total": total, "message": "Orden creada correctamente"}
    except Exception as e:
        print("Error creating order:", e)
        raise HTTPException(status_code=500, detail="Error al crear la orden: " + str(e))

# --- Mercado Pago Preference & Webhook ---
@app.post("/api/payments/mercadopago/create-preference")
def create_mp_preference(payload: dict):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id requerido")
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        cursor.execute("SELECT value FROM system_settings WHERE key = 'mercadopago_access_token'")
        row = cursor.fetchone()
        access_token = (row['value'] if row and row['value'] else None) or os.getenv("MERCADOPAGO_ACCESS_TOKEN")

    if not access_token:
        raise HTTPException(
            status_code=503,
            detail="Mercado Pago aún no cuenta con Access Token configurado. Puedes pagar vía Transferencia Bancaria o ingresar la credencial en el panel de administración."
        )

    total = int(order["total"])
    title = f"Origen Canino — Pedido #{order_id}"
    
    mp_url = "https://api.mercadopago.com/checkout/preferences"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    pref_data = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "currency_id": "CLP",
                "unit_price": total
            }
        ],
        "payer": {
            "name": order["customer_name"],
            "email": order["customer_email"] or "cliente@origencanino.cl"
        },
        "metadata": {
            "order_id": order_id
        },
        "external_reference": str(order_id),
        "notification_url": "https://origencanino.cl/api/webhooks/mercadopago",
        "back_urls": {
            "success": f"https://origencanino.cl/?payment=success&order_id={order_id}",
            "failure": f"https://origencanino.cl/?payment=failure&order_id={order_id}",
            "pending": f"https://origencanino.cl/?payment=pending&order_id={order_id}"
        },
        "auto_return": "approved"
    }
    
    try:
        req = urllib.request.Request(
            mp_url,
            data=json.dumps(pref_data).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            mp_res = json.loads(response.read().decode("utf-8"))
            pref_id = mp_res.get("id")
            
            with get_connection() as conn:
                conn.cursor().execute(
                    "UPDATE orders SET mercadopago_preference_id = %s WHERE id = %s",
                    (pref_id, order_id)
                )
                conn.commit()
                
            return {
                "success": True,
                "init_point": mp_res.get("init_point"),
                "sandbox_init_point": mp_res.get("sandbox_init_point"),
                "preference_id": pref_id
            }
    except Exception as e:
        print("[MercadoPago Error]:", e)
        raise HTTPException(status_code=502, detail=f"Error comunicando con Mercado Pago: {str(e)}")

@app.post("/api/webhooks/mercadopago")
async def mercadopago_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        payload = {}
        
    topic = payload.get("type") or payload.get("topic") or request.query_params.get("type") or request.query_params.get("topic")
    data_id = (payload.get("data") or {}).get("id") or payload.get("id") or request.query_params.get("data.id") or request.query_params.get("id")
    
    if topic == "payment" and data_id:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'mercadopago_access_token'")
            row = cursor.fetchone()
            access_token = (row['value'] if row and row['value'] else None) or os.getenv("MERCADOPAGO_ACCESS_TOKEN")
            
        if access_token:
            try:
                check_url = f"https://api.mercadopago.com/v1/payments/{data_id}"
                req = urllib.request.Request(
                    check_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    p_data = json.loads(resp.read().decode("utf-8"))
                    
                status = p_data.get("status")
                ext_ref = p_data.get("external_reference")
                
                if status == "approved" and ext_ref:
                    order_id = int(ext_ref)
                    full_order = None
                    order_items = []
                    with get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE orders 
                            SET payment_status = 'Pagado', mercadopago_payment_id = %s
                            WHERE id = %s
                        """, (str(data_id), order_id))
                        
                        # Obtener datos completos de la orden y productos para la notificación
                        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
                        full_order = cursor.fetchone()
                        
                        cursor.execute("""
                            SELECT product_name, quantity, price_at_purchase 
                            FROM order_items 
                            WHERE order_id = %s
                        """, (order_id,))
                        order_items = cursor.fetchall()
                        conn.commit()

                    # Armar notificación de venta real confirmada a Telegram
                    paid_amount = p_data.get('transaction_amount', full_order.get('total', 0) if full_order else 0)
                    msg = f"🎉 ¡VENTA CONFIRMADA Y PAGADA EN MERCADO PAGO! (#{order_id})\n\n"
                    if full_order:
                        if full_order.get('is_subscription'):
                            msg = f"🔄 ¡SUSCRIPCIÓN PAGADA EN MERCADO PAGO! (#{order_id})\n\n"
                        msg += f"👤 Cliente: {full_order.get('customer_name')}\n"
                        msg += f"📞 Teléfono: {full_order.get('customer_phone')}\n"
                        msg += f"📍 Dirección: {full_order.get('customer_address')}, {full_order.get('customer_city')}\n"
                        msg += f"💳 Método: Mercado Pago Online (Aprobado)\n"
                        msg += f"🆔 Transacción MP: {data_id}\n\n"

                        if order_items:
                            msg += "🛒 Productos Comprados:\n"
                            for it in order_items:
                                msg += f"  • {it.get('quantity')}x {it.get('product_name')} (${it.get('price_at_purchase'):,})\n"
                            msg += "\n"

                        msg += f"💰 Total Pagado: ${int(paid_amount):,}\n\n"
                        msg += "✅ El pago está 100% acreditado. Puedes preparar el pedido."
                    else:
                        msg += f"💰 Monto: ${int(paid_amount):,}\nID Pago MP: {data_id}"

                    notify_telegram(msg)
            except Exception as e:
                print("[MP Webhook Error]:", e)
                
    return {"status": "ok"}

# --- NFC Communities Endpoints ---
@app.get("/api/nfc/validate/{slug}")
def validate_nfc(slug: str):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, slug, address, street_references, discount_percent, active 
                FROM nfc_buildings 
                WHERE slug = %s AND active = 1
            """, (slug.strip().lower(),))
            building = cursor.fetchone()
            if not building:
                return {"valid": False, "message": "Comunidad no encontrada o inactiva"}
            
            cursor.execute("UPDATE nfc_buildings SET visits_count = visits_count + 1 WHERE slug = %s", (slug.strip().lower(),))
            conn.commit()
            
            return {
                "valid": True,
                "name": building["name"],
                "slug": building["slug"],
                "address": building["address"],
                "street_references": building["street_references"],
                "discount_percent": building["discount_percent"]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/nfc-buildings")
def get_admin_buildings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.*, 
                       COUNT(o.id) as orders_count,
                       COALESCE(SUM(o.total), 0) as total_revenue
                FROM nfc_buildings b
                LEFT JOIN orders o ON o.nfc_building_code = b.slug
                GROUP BY b.id
                ORDER BY b.id DESC
            """)
            return [dict(r) for r in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/nfc-buildings")
def create_building(b: BuildingCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO nfc_buildings (name, slug, address, street_references, discount_percent, contact_info, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (b.name, b.slug.strip().lower(), b.address, b.street_references, b.discount_percent, b.contact_info, b.active))
            new_id = cursor.fetchone()['id']
            conn.commit()
            return {"success": True, "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando edificio NFC: " + str(e))

@app.put("/api/admin/nfc-buildings/{b_id}")
def update_building(b_id: int, b: BuildingCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE nfc_buildings
                SET name = %s, slug = %s, address = %s, street_references = %s, discount_percent = %s, contact_info = %s, active = %s
                WHERE id = %s
            """, (b.name, b.slug.strip().lower(), b.address, b.street_references, b.discount_percent, b.contact_info, b.active, b_id))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando edificio NFC: " + str(e))

@app.delete("/api/admin/nfc-buildings/{b_id}")
def delete_building(b_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM nfc_buildings WHERE id = %s", (b_id,))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Public Bank & System Settings ---
@app.get("/api/settings/bank-transfer")
def get_public_bank_settings():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings WHERE key LIKE 'bank_%' OR key LIKE 'mercadopago_%'")
            rows = cursor.fetchall()
            settings = {r['key']: r['value'] for r in rows}
            # Mask or check if MP is active
            has_token = bool(settings.get('mercadopago_access_token') or os.getenv("MERCADOPAGO_ACCESS_TOKEN"))
            settings['mercadopago_ready'] = has_token and settings.get('mercadopago_enabled', '1') == '1'
            if 'mercadopago_access_token' in settings:
                del settings['mercadopago_access_token']
            return settings
    except Exception as e:
        return {}

@app.get("/api/admin/settings")
def get_admin_settings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_settings")
            rows = cursor.fetchall()
            settings = {r['key']: r['value'] for r in rows}
            val = settings.get('mercadopago_access_token') or os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
            settings['has_mp_token'] = bool(val)
            settings['mercadopago_access_token_masked'] = (val[:6] + "..." + val[-4:]) if len(val) > 10 else ("***" if val else "")
            return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/settings")
def update_admin_settings(payload: SettingsUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            for k, v in payload.settings.items():
                if v is not None and not (k == 'mercadopago_access_token' and v == '***'):
                    cursor.execute("""
                        INSERT INTO system_settings (key, value, updated_at)
                        VALUES (%s, %s, CURRENT_TIMESTAMP)
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
                    """, (k, str(v)))
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Configuración de Calculadora de Raciones ---
DEFAULT_CALCULATOR_SETTINGS = {
    # Dieta BARF (Cruda) - Referencia Médica Veterinaria Oficial
    "barf_puppy_2_4": 10.0,
    "barf_puppy_4_6": 8.0,
    "barf_puppy_6_8": 6.0,
    "barf_puppy_8_10": 4.0,
    "barf_puppy_10_12": 3.0,
    "barf_adult_normal": 3.0,
    "barf_adult_medium": 2.5,
    "barf_adult_low": 2.0,
    # Comida Cocinada al Vapor
    "cooked_puppy_small": 8.0,
    "cooked_puppy_large": 5.0,
    "cooked_adult_low": 2.0,
    "cooked_adult_normal": 2.5,
    "cooked_adult_high": 3.5,
}

@app.get("/api/calculator/settings")
def get_public_calculator_settings():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'calculator_percentages'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_CALCULATOR_SETTINGS, **data}
            return DEFAULT_CALCULATOR_SETTINGS
    except Exception:
        return DEFAULT_CALCULATOR_SETTINGS

@app.get("/api/admin/calculator-settings")
def get_admin_calculator_settings(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'calculator_percentages'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_CALCULATOR_SETTINGS, **data}
            return DEFAULT_CALCULATOR_SETTINGS
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/calculator-settings")
def update_admin_calculator_settings(payload: SettingsUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            val_json = json.dumps(payload.settings)
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('calculator_percentages', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (val_json,))
            conn.commit()
            return {"success": True, "settings": payload.settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- First-Order Promotions Endpoints ---
DEFAULT_PROMO_SETTINGS = {
    "enabled": True,
    "percent": 10,
    "code": "BIENVENIDO10",
    "title": "¡10% OFF en tu primera compra!",
    "description": "Descuento automático exclusivo para nuevos clientes en su primer pedido."
}

@app.get("/api/promotions/first-order")
def get_public_first_order_promo():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'first_order_promo'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_PROMO_SETTINGS, **data}
            return DEFAULT_PROMO_SETTINGS
    except Exception:
        return DEFAULT_PROMO_SETTINGS

@app.get("/api/promotions/check-eligibility")
def check_first_order_eligibility(email: str = Query("")):
    clean_email = email.strip().lower()
    if not clean_email:
        return {"eligible": True, "order_count": 0}
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM orders 
                WHERE LOWER(customer_email) = %s AND payment_status != 'Cancelado'
            """, (clean_email,))
            row = cursor.fetchone()
            order_count = row['cnt'] if row else 0
            return {
                "eligible": order_count == 0,
                "order_count": order_count
            }
    except Exception as e:
        return {"eligible": True, "order_count": 0, "error": str(e)}

@app.get("/api/admin/promotions/first-order")
def get_admin_first_order_promo(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'first_order_promo'")
            row = cursor.fetchone()
            if row and row.get('value'):
                data = json.loads(row['value'])
                return {**DEFAULT_PROMO_SETTINGS, **data}
            return DEFAULT_PROMO_SETTINGS
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/promotions/first-order")
def update_admin_first_order_promo(payload: PromoSettingsUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            val_json = json.dumps(payload.dict())
            cursor.execute("""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('first_order_promo', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (val_json,))
            conn.commit()
            return {"success": True, "settings": payload.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/orders")
def get_orders(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
            orders_rows = cursor.fetchall()
            
            orders = []
            for row in orders_rows:
                order_dict = dict(row)
                cursor.execute("SELECT * FROM order_items WHERE order_id = %s", (order_dict["id"],))
                order_dict["items"] = [dict(item) for item in cursor.fetchall()]
                orders.append(order_dict)
                
            return orders
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error obteniendo órdenes.")

@app.put("/api/admin/orders/{order_id}")
def update_order(order_id: int, update_data: OrderStatusUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            updates = []
            params = []
            if update_data.payment_status is not None:
                updates.append("payment_status = %s")
                params.append(update_data.payment_status)
            if update_data.delivery_status is not None:
                updates.append("delivery_status = %s")
                params.append(update_data.delivery_status)
                
            if not updates:
                return {"success": True, "message": "Nada que actualizar"}
                
            params.append(order_id)
            query = f"UPDATE orders SET {', '.join(updates)} WHERE id = %s"
            cursor.execute(query, tuple(params))
            conn.commit()
            return {"success": True, "message": "Orden actualizada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando la orden.")

@app.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            # Eliminar items de la orden primero por FK
            cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
            # Eliminar la orden
            cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
            conn.commit()
            return {"success": True, "message": "Orden eliminada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error eliminando la orden.")

# --- Testimonials Endpoints ---
@app.get("/api/testimonials")
def get_testimonials():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM testimonials WHERE status = 'approved' ORDER BY id DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al obtener los testimonios")

@app.post("/api/testimonials")
def create_testimonial(
    owner_name: str = Form(...),
    dog_name: str = Form(...),
    content: str = Form(...),
    rating: int = Form(...),
    image: Optional[UploadFile] = File(None)
):
    try:
        image_path = None
        if image and image.filename:
            if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
                raise HTTPException(status_code=400, detail="Formato de imagen inválido. Solo JPG, PNG o WEBP.")
                
            try:
                image_data = image.file.read()
                img = Image.open(io.BytesIO(image_data))
                
                # Crop to square and resize
                width, height = img.size
                min_dim = min(width, height)
                left = (width - min_dim) / 2
                top = (height - min_dim) / 2
                right = (width + min_dim) / 2
                bottom = (height + min_dim) / 2
                
                img = img.crop((left, top, right, bottom))
                img = img.resize((400, 400), Image.Resampling.LANCZOS)
                
                filename = f"{uuid.uuid4().hex}.webp"
                filepath = os.path.join("uploads", "testimonials", filename)
                
                img.save(filepath, format="WEBP", quality=80)
                image_path = f"/uploads/testimonials/{filename}"
            except UnidentifiedImageError:
                raise HTTPException(status_code=400, detail="El archivo subido no es una imagen válida.")
            except Exception as e:
                print("Error processing image:", e)
                raise HTTPException(status_code=500, detail="Error al procesar la imagen.")

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO testimonials (owner_name, dog_name, content, rating, status, image_path)
                VALUES (%s, %s, %s, %s, 'pending', %s)
            """, (owner_name, dog_name, content, rating, image_path))
            conn.commit()
            
            # Notificar por Telegram
            msg = f"⭐ <b>Nuevo Testimonio (Pendiente)</b> ⭐\n"
            msg += f"<b>De:</b> {owner_name} y {dog_name}\n"
            msg += f"<b>Calificación:</b> {rating} estrellas\n"
            msg += f"<b>Comentario:</b> {content}\n"
            if image_path:
                msg += f"🖼️ <b>Foto subida</b>\n"
            msg += f"👉 Revisa el panel de admin para aprobarlo."
            notify_telegram(msg)
            
            return {"success": True, "message": "Testimonio enviado para revisión"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print("Error saving testimonial:", e)
        raise HTTPException(status_code=500, detail="Error al enviar el testimonio")

@app.get("/api/admin/testimonials")
def admin_get_testimonials(current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM testimonials ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al obtener los testimonios")

@app.patch("/api/admin/testimonials/{t_id}/status")
def update_testimonial_status(t_id: int, update: TestimonialStatusUpdate, current_user: str = Depends(get_current_admin)):
    if update.status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE testimonials SET status = %s WHERE id = %s", (update.status, t_id))
            conn.commit()
            return {"success": True, "message": "Estado actualizado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al actualizar el estado")

# --- Serve Frontend (for Nixpacks / Production) ---
dist_path = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve exact file if it exists
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise fallback to index.html (SPA routing)
        return FileResponse(os.path.join(dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

@app.get("/api/admin/finance/report")
def get_finance_report(month: int, year: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Fetch all paid orders for the month
            cursor.execute("""
                SELECT id, total, shipping_cost, created_at 
                FROM orders 
                WHERE payment_status = 'Pagado' 
                  AND EXTRACT(MONTH FROM created_at) = %s 
                  AND EXTRACT(YEAR FROM created_at) = %s
            """, (month, year))
            orders_rows = cursor.fetchall()
            
            total_sales = sum(r['total'] for r in orders_rows)
            total_shipping = sum(r['shipping_cost'] for r in orders_rows)
            
            # Calculate total production cost
            # We need to sum up (product_quantity * (fixed_cost + ingredients_cost))
            cursor.execute("""
                SELECT 
                    oi.quantity, 
                    p.fixed_cost,
                    COALESCE((
                        SELECT SUM(pi.quantity * i.cost_per_unit)
                        FROM product_ingredients pi
                        JOIN ingredients i ON pi.ingredient_id = i.id
                        WHERE pi.product_id = p.id
                    ), 0) as recipe_cost
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                WHERE o.payment_status = 'Pagado'
                  AND EXTRACT(MONTH FROM o.created_at) = %s 
                  AND EXTRACT(YEAR FROM o.created_at) = %s
            """, (month, year))
            items_rows = cursor.fetchall()
            
            total_production_cost = 0
            for item in items_rows:
                qty = item['quantity']
                fixed = item['fixed_cost'] or 0
                recipe = item['recipe_cost'] or 0
                total_production_cost += qty * (fixed + recipe)
                
            return {
                "total_sales": total_sales,
                "total_shipping": total_shipping,
                "total_production_cost": total_production_cost,
                "net_profit": (total_sales - total_shipping) - total_production_cost,
                "orders_count": len(orders_rows)
            }
    except Exception as e:
        print(f"Error generating finance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/products/{product_id}/nutrition")
def get_product_nutrition(product_id: int, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Fetch the recipe
            cursor.execute("""
                SELECT 
                    pi.quantity,
                    i.name,
                    i.unit,
                    i.kcal_per_100g,
                    i.protein_g,
                    i.fat_g,
                    i.fiber_g,
                    i.moisture_g,
                    i.ash_g,
                    i.carbs_g
                FROM product_ingredients pi
                JOIN ingredients i ON pi.ingredient_id = i.id
                WHERE pi.product_id = %s
            """, (product_id,))
            
            items = cursor.fetchall()
            
            total_weight_g = 0
            totals = {
                "kcal": 0, "protein": 0, "fat": 0, "fiber": 0, "moisture": 0, "ash": 0, "carbs": 0
            }
            
            for item in items:
                # Convert quantity to grams based on unit
                qty_in_g = 0
                if item["unit"] == "kg" or item["unit"] == "litro":
                    qty_in_g = item["quantity"] * 1000
                elif item["unit"] == "g" or item["unit"] == "ml":
                    qty_in_g = item["quantity"]
                else:
                    # Fallback for 'unidad' or unknown
                    qty_in_g = item["quantity"] * 100 # Wild guess, but better to avoid 'unidad' for nutrition
                    
                total_weight_g += qty_in_g
                
                # multiplier based on per 100g
                mult = qty_in_g / 100.0
                
                totals["kcal"] += (item["kcal_per_100g"] or 0) * mult
                totals["protein"] += (item["protein_g"] or 0) * mult
                totals["fat"] += (item["fat_g"] or 0) * mult
                totals["fiber"] += (item["fiber_g"] or 0) * mult
                totals["moisture"] += (item["moisture_g"] or 0) * mult
                totals["ash"] += (item["ash_g"] or 0) * mult
                totals["carbs"] += (item["carbs_g"] or 0) * mult
                
            # If total_weight_g is 0, return 0s to avoid division by zero
            if total_weight_g == 0:
                return {
                    "total_weight_g": 0,
                    "totals": totals,
                    "per_100g": totals
                }
                
            # Calculate per 100g of the FINAL product
            per_100g_mult = 100.0 / total_weight_g
            per_100g = {
                "kcal": totals["kcal"] * per_100g_mult,
                "protein": totals["protein"] * per_100g_mult,
                "fat": totals["fat"] * per_100g_mult,
                "fiber": totals["fiber"] * per_100g_mult,
                "moisture": totals["moisture"] * per_100g_mult,
                "ash": totals["ash"] * per_100g_mult,
                "carbs": totals["carbs"] * per_100g_mult,
            }
            
            return {
                "total_weight_g": total_weight_g,
                "totals": totals,
                "per_100g": per_100g
            }
            
    except Exception as e:
        print(f"Error calculating nutrition: {e}")
        raise HTTPException(status_code=500, detail="Error calculando nutricion")
