import os
import json
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
    fixed_cost: int = 0

class IngredientResponse(BaseModel):
    id: int
    name: str
    cost_per_unit: int
    unit: str

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

class OrderStatusUpdate(BaseModel):
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None

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
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
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
                SET name = %s, price = %s, weight = %s, description = %s, ingredients = %s, benefits = %s, is_new = %s, fixed_cost = %s
                WHERE id = %s
            """, (p.name, p.price, p.weight, p.description, json.dumps(p.ingredients), json.dumps(p.benefits), int(p.isNew), p.fixed_cost, product_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error actualizando el producto.")

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
            return {"success": True, "id": cursor.fetchone()["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error creando ingrediente")

@app.put("/api/admin/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: int, i: IngredientCreateUpdate, current_user: str = Depends(get_current_admin)):
    try:
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
            return {"success": True}
    except Exception as e:
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
    
    # Envío gratis si es suscripción, de lo contrario $5000 si es menor a $100.000
    if order.is_subscription:
        shipping_cost = 0
    else:
        shipping_cost = 5000 if subtotal < 100000 else 0
        
    total = subtotal + shipping_cost

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, customer_city, customer_region, subtotal, shipping_cost, total, is_subscription)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (order.customer_name, order.customer_email, order.customer_phone, order.customer_address, order.customer_city, order.customer_region, subtotal, shipping_cost, total, int(order.is_subscription)))
            
            order_id = cursor.fetchone()['id']
            
            for item in order.items:
                cursor.execute("""
                    INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
                    VALUES (%s, %s, %s, %s, %s)
                """, (order_id, item.id, item.name, item.quantity, item.price))
            
            conn.commit()
            
            # Send Telegram notification
            msg = f"🐶 ¡Nuevo Pedido en Origen Canino! (#{order_id})\n\n"
            if order.is_subscription:
                msg = f"🔄 ¡NUEVA SUSCRIPCIÓN MENSUAL! (#{order_id})\n\n"
                
            msg += f"👤 Cliente: {order.customer_name}\n"
            msg += f"📞 Teléfono: {order.customer_phone}\n"
            msg += f"📍 Dirección: {order.customer_address}, {order.customer_city}\n"
            msg += f"💰 Total: ${total:,}\n\n"
            
            if order.is_subscription:
                msg += "⚠️ Importante: Es una suscripción manual. Recuerda contactar al cliente 1 semana antes del próximo mes.\n\n"
                
            msg += "Revisa el panel de admin para más detalles."
            notify_telegram(msg)
            
            return {"success": True, "order_id": order_id, "message": "Orden creada correctamente"}
    except Exception as e:
        print("Error creating order:", e)
        raise HTTPException(status_code=500, detail="Error al crear la orden.")

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
