import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import urllib.request
import urllib.parse
from server_db import get_connection, init_database
from PIL import Image, UnidentifiedImageError
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

class ProductUpdate(BaseModel):
    name: str
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

# --- Endpoints Públicos ---
# --- Utilidades ---
def notify_telegram(message: str):
    if os.path.exists("backend/.env"):
        load_dotenv("backend/.env", override=True)
    elif os.path.exists(".env"):
        load_dotenv(".env", override=True)
        
    token = os.getenv("TELEGRAM_BOT_TOKEN") or "9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ"
    # Si sigue con el token viejo de GetContact, forzar el nuevo
    if token.startswith("8623970624"):
        token = "9089876682:AAFeQDNJLqt7qGodbf7EH3fh5gTHlMH2FSQ"
        
    chat_id = os.getenv("TELEGRAM_CHAT_ID") or "1468481915"
    if not token or not chat_id:
        print("Telegram env vars missing, skipping notification.")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({'chat_id': chat_id, 'text': message}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req)
    except Exception as e:
        print("Error sending telegram notification:", e)

class ContactMessage(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str

# --- Endpoints Auth Admin ---
@app.post("/api/admin/login")
def login(request: LoginRequest):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM admin_users WHERE email = %s", (request.email,))
            user = cursor.fetchone()
            if not user or not verify_password(request.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
            
            session_id = str(uuid.uuid4())
            code = str(random.randint(10000, 99999))
            expires_at = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            
            cursor.execute("""
                INSERT INTO admin_2fa_codes (email, session_id, code, expires_at)
                VALUES (%s, %s, %s, %s)
            """, (request.email, session_id, code, expires_at))
            conn.commit()
            
            msg = f"🔐 *Código de acceso admin Origen Canino*\n\nAlguien está intentando iniciar sesión.\nTu código es: {code}"
            notify_telegram(msg)
            
            return {"requires_2fa": True, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/admin/verify-2fa")
def verify_2fa(request: Verify2FARequest):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM admin_2fa_codes 
            WHERE session_id = %s AND code = %s
        """, (request.session_id, request.code))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Código inválido o sesión expirada")
            
        expires_at = row["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
            
        if datetime.utcnow() > expires_at:
            raise HTTPException(status_code=401, detail="Código expirado")
            
        cursor.execute("DELETE FROM admin_2fa_codes WHERE session_id = %s", (request.session_id,))
        conn.commit()
        
        access_token = create_access_token(data={"sub": row["email"]})
        return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/admin/change-password")
def change_password(request: ChangePasswordRequest, current_user: str = Depends(get_current_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin_users WHERE email = %s", (current_user,))
        user = cursor.fetchone()
        
        if not verify_password(request.old_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
            
        new_hash = get_password_hash(request.new_password)
        cursor.execute("UPDATE admin_users SET password_hash = %s WHERE email = %s", (new_hash, current_user))
        conn.commit()
        return {"success": True, "message": "Contraseña actualizada"}

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

@app.put("/api/products/{product_id}")
def update_product(product_id: int, p: ProductUpdate, current_user: str = Depends(get_current_admin)):
    try:
        with get_connection() as conn:
            conn.cursor().execute("""
                UPDATE products 
                SET name = %s, price = %s, weight = %s, description = %s, ingredients = %s, benefits = %s, is_new = %s, image = %s, fixed_cost = %s
                WHERE id = %s
            """, (p.name, p.price, p.weight, p.description, json.dumps(p.ingredients), json.dumps(p.benefits), int(p.isNew), p.image, p.fixed_cost, product_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        print(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando el producto.")

@app.post("/api/admin/products/upload-image")
async def upload_product_image(file: UploadFile = File(...), current_user: str = Depends(get_current_admin)):
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        if image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")
            
        filename = f"{uuid.uuid4().hex}.webp"
        filepath = os.path.join("uploads", "products", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        image.save(filepath, "WEBP", quality=80, method=6)
        
        return {"url": f"/uploads/products/{filename}"}
    except Exception as e:
        print(f"Error uploading product image: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la imagen.")

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
@app.post("/api/orders")
def create_order(order: OrderCreate):
    subtotal = sum(item.price * item.quantity for item in order.items)
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
            cursor.execute("""
                INSERT INTO orders (
                    customer_name, customer_email, customer_phone, customer_address, 
                    customer_city, customer_region, subtotal, shipping_cost, total, 
                    is_subscription, dog_name, dog_weight, dog_age, payment_method, 
                    transfer_bank, transfer_receipt_number, nfc_building_code, 
                    discount_amount, payment_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
            """, (
                order.customer_name, order.customer_email, order.customer_phone, order.customer_address, 
                order.customer_city, order.customer_region, subtotal, shipping_cost, total, 
                int(order.is_subscription), order.dog_name, order.dog_weight, order.dog_age,
                order.payment_method or 'transferencia', order.transfer_bank, order.transfer_receipt_number,
                order.nfc_building_code, discount, initial_payment_status
            ))
            
            order_id = cursor.fetchone()['id']
            
            for item in order.items:
                cursor.execute("""
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
                    VALUES (%s, %s, %s, %s, %s)
                """, (order_id, item.id, item.name, item.quantity, item.price))
            
            # Si provino de un NFC de edificio, registrar visita/orden
            if order.nfc_building_code:
                cursor.execute("UPDATE nfc_buildings SET visits_count = visits_count + 1 WHERE slug = %s", (order.nfc_building_code,))

            conn.commit()
            
            # Send Telegram notification
            msg = f"🐶 ¡Nuevo Pedido en Origen Canino! (#{order_id})\n\n"
            if order.is_subscription:
                msg = f"🔄 ¡NUEVA SUSCRIPCIÓN MENSUAL! (#{order_id})\n\n"
                
            msg += f"👤 Cliente: {order.customer_name}\n"
            msg += f"📞 Teléfono: {order.customer_phone}\n"
            msg += f"📍 Dirección: {order.customer_address}, {order.customer_city}\n"
            msg += f"💳 Método: {'Mercado Pago Online' if order.payment_method == 'mercadopago' else 'Transferencia Bancaria'}\n"
            
            if order.payment_method == 'transferencia' and order.transfer_bank:
                msg += f"🏦 Banco: {order.transfer_bank} | N° Operación: {order.transfer_receipt_number or 'Sin registrar'}\n"

            if order.nfc_building_code:
                msg += f"🏢 Tag NFC Comunidad: {order.nfc_building_code} (Descuento: -${discount:,})\n"

            msg += f"💰 Total a Pagar: ${total:,}\n\n"
            
            if order.is_subscription:
                msg += "⚠️ Importante: Es una suscripción manual. Recuerda contactar al cliente 1 semana antes del próximo mes.\n\n"
                
            msg += "Revisa el panel de admin para más detalles."
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
        
    topic = payload.get("type") or payload.get("topic")
    data_id = (payload.get("data") or {}).get("id") or payload.get("id")
    
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
                    with get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE orders 
                            SET payment_status = 'Pagado', mercadopago_payment_id = %s
                            WHERE id = %s
                        """, (str(data_id), order_id))
                        conn.commit()
                        
                    notify_telegram(f"🎉 ¡PAGO APROBADO EN MERCADO PAGO!\n\n🐶 Pedido #{order_id}\n💰 Monto: ${p_data.get('transaction_amount', 0):,}\nID Pago MP: {data_id}")
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
