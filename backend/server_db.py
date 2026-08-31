import psycopg2
import psycopg2.extras
import json
import os
from datetime import datetime
from dotenv import load_dotenv

import psycopg2.pool
from contextlib import contextmanager

load_dotenv()

DB_URL = os.environ.get('DATABASE_URL')

# Fix Render/Heroku legacy "postgres://" prefix → "postgresql://" if necessary,
# though psycopg2 accepts both, it matches legrandpetit's protocol.
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

db_pool = None
if DB_URL:
    db_pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=DB_URL,
        cursor_factory=psycopg2.extras.RealDictCursor
    )

@contextmanager
def get_connection():
    """Conexión robusta a PostgreSQL usando un pool con pre-ping."""
    if not db_pool:
        raise ValueError("DATABASE_URL no está configurada en las variables de entorno.")
    
    conn = db_pool.getconn()
    try:
        # Pre-ping: Verificar si la conexión sigue viva (evita errores "server closed the connection")
        try:
            with conn.cursor() as c:
                c.execute("SELECT 1")
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            db_pool.putconn(conn, close=True)
            conn = db_pool.getconn()
            
        yield conn
    except Exception:
        if not conn.closed:
            conn.rollback()
        raise
    finally:
        if not conn.closed:
            # En psycopg2, devolver al pool no hace rollback automático
            # Hacemos rollback por si quedó una transacción abierta sin commit
            try:
                conn.rollback()
            except Exception:
                pass
            db_pool.putconn(conn)

def init_database():
    """Inicializa el esquema relacional con datos semilla."""
    print("Conectando a PostgreSQL para inicializar...")
    with get_connection() as conn:
        with conn.cursor() as cursor:
            # 1. Tabla de Productos
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    price INTEGER NOT NULL,
                    weight TEXT NOT NULL,
                    description TEXT NOT NULL,
                    ingredients TEXT NOT NULL,
                    benefits TEXT NOT NULL,
                    image TEXT NOT NULL,
                    is_new INTEGER DEFAULT 0,
                    active INTEGER DEFAULT 1,
                    fixed_cost INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Asegurar que fixed_cost exista si la tabla ya fue creada previamente
            cursor.execute("""
                ALTER TABLE products ADD COLUMN IF NOT EXISTS fixed_cost INTEGER DEFAULT 0;
            """)

            # 1.1 Tabla de Ingredientes (Inventario/Materia Prima)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ingredients (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    cost_per_unit INTEGER NOT NULL,
                    unit TEXT NOT NULL,  -- ej: 'kg', 'unidad', 'litro'
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 1.2 Tabla de Recetas (Ingredientes por Producto)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS product_ingredients (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
                    quantity NUMERIC NOT NULL, -- Cantidad de la unidad (ej: 0.5 kg)
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 2. Tabla de Mensajes de Contacto
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contact_messages (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT,
                    message TEXT NOT NULL,
                    status TEXT DEFAULT 'Nuevo',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 3. Tabla de Usuarios Administradores
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 3.1 Tabla de Códigos 2FA
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_2fa_codes (
                    id SERIAL PRIMARY KEY,
                    email TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 4. Tabla de Blog Posts
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS blog_posts (
                    id SERIAL PRIMARY KEY,
                    slug TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    excerpt TEXT NOT NULL,
                    content TEXT NOT NULL,
                    image TEXT NOT NULL,
                    active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 5. Tabla de Órdenes (Pedidos)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    customer_name TEXT NOT NULL,
                    customer_email TEXT NOT NULL,
                    customer_phone TEXT NOT NULL,
                    customer_address TEXT NOT NULL,
                    customer_city TEXT NOT NULL,
                    customer_region TEXT NOT NULL,
                    subtotal INTEGER NOT NULL,
                    shipping_cost INTEGER NOT NULL,
                    total INTEGER NOT NULL,
                    payment_status TEXT DEFAULT 'Pendiente',
                    delivery_status TEXT DEFAULT 'Preparación',
                    is_subscription INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 6. Tabla de Ítems de Órdenes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL,
                    product_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    price_at_purchase INTEGER NOT NULL
                );
            """)

            # 7. Tabla de Testimonios
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS testimonials (
                    id SERIAL PRIMARY KEY,
                    owner_name TEXT NOT NULL,
                    dog_name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    image_path TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Cargar datos semilla si la base de datos es nueva
            cursor.execute("SELECT COUNT(*) FROM products")
            if cursor.fetchone()['count'] == 0:
                default_products = [
                    (
                        'Dieta BARF (Cruda)',
                        'barf',
                        5000,
                        '1 Kg',
                        'Alimento crudo biológicamente apropiado para perros.',
                        json.dumps(['Huesos carnosos', 'Carne magra', 'Vísceras', 'Vegetales triturados']),
                        json.dumps(['Digestión óptima', 'Dientes más limpios', 'Mayor energía']),
                        'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop&q=60',
                        1
                    ),
                    (
                        'Dieta Cocinada Cerdo',
                        'cocinada',
                        8000,
                        '1 Kg',
                        'Comida suave cocinada a baja temperatura para fácil digestión.',
                        json.dumps(['Cerdo magro', 'Arroz integral', 'Zanahoria', 'Zapallo', 'Suplementos']),
                        json.dumps(['Fácil digestión', 'Alta palatabilidad', 'Ideal para estómagos sensibles']),
                        'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=500&auto=format&fit=crop&q=60',
                        0
                    ),
                    (
                        'Pack Inicia (Cerdo)',
                        'cocinada',
                        6990,
                        '1 Kg',
                        'El formato perfecto para probar la dieta cocinada por primera vez. Ideal para la transición.',
                        json.dumps(['Cerdo magro', 'Arroz integral', 'Zanahoria', 'Zapallo', 'Suplementos']),
                        json.dumps(['Ideal para probar', 'Fácil digestión', 'Transición segura']),
                        'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=500&auto=format&fit=crop&q=60',
                        1
                    ),
                    (
                        'Patitas de Pollo Deshidratadas',
                        'snack',
                        4500,
                        '200 g',
                        'Snack natural deshidratado a baja temperatura, ideal para la limpieza dental y articulaciones.',
                        json.dumps(['Patas de pollo 100% naturales']),
                        json.dumps(['Limpieza dental', 'Fuente natural de condroitina', 'Entretenimiento seguro']),
                        'https://images.unsplash.com/photo-1626082264629-652f205ab016?w=500&auto=format&fit=crop&q=60',
                        1
                    ),
                    (
                        'Caldo de Colágeno',
                        'snack',
                        3500,
                        '500 ml',
                        'Caldo de huesos cocinado a fuego lento por más de 24 horas, repleto de nutrientes.',
                        json.dumps(['Huesos de vacuno', 'Agua purificada', 'Vinagre de manzana']),
                        json.dumps(['Salud articular', 'Hidratación profunda', 'Refuerzo inmunológico']),
                        'https://images.unsplash.com/photo-1579567761406-4684ee0c75b6?w=500&auto=format&fit=crop&q=60',
                        1
                    )
                ]
                cursor.executemany("""
                    INSERT INTO products (name, type, price, weight, description, ingredients, benefits, image, is_new)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, default_products)
                
                cursor.execute("""
                    INSERT INTO admin_users (email, password_hash)
                    VALUES ('admin@origencanino.cl', '$2b$12$L8yO7Z172Y65851O8G.TtuH9q1h8q0p3o.Jk5M63Yk.8Gv15g79D2');
                """)

            cursor.execute("SELECT COUNT(*) FROM blog_posts")
            if cursor.fetchone()['count'] == 0:
                default_blogs = [
                    (
                        'el-peligro-de-los-ultraprocesados',
                        'El peligro de los ultraprocesados (Croquetas)',
                        'Descubre qué se esconde realmente detrás de las bolitas secas y cómo afectan la salud a largo plazo de tu mascota.',
                        'Las croquetas comerciales, aunque convenientes, son alimentos ultraprocesados sometidos a altas temperaturas que destruyen los nutrientes naturales. Para compensar, se añaden vitaminas sintéticas. Además, suelen contener un alto porcentaje de carbohidratos (maíz, trigo, soya) que los perros no procesan eficientemente, llevando a problemas de obesidad, alergias y estrés en órganos como el páncreas y el hígado. Alimentar a tu perro exclusivamente con croquetas es el equivalente a que un humano coma cereal procesado todos los días de su vida.',
                        'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&q=80&w=800'
                    ),
                    (
                        'beneficios-biologicos-dieta-barf',
                        'Beneficios biológicos de la Dieta BARF',
                        'Conoce por qué volver al origen y respetar la genética de tu perro transforma su energía, pelaje y digestión.',
                        'La dieta BARF (Biologically Appropriate Raw Food) imita lo que un canino comería en estado salvaje. Al estar compuesta de carne muscular, huesos carnosos, vísceras y vegetales triturados, proporciona hidratación natural y enzimas vivas. Los beneficios se notan rápidamente: heces más pequeñas y con menos olor, dientes limpios sin sarro (gracias a la masticación de huesos carnosos), un sistema inmunológico fortalecido, pelaje brillante y una reducción dramática en alergias cutáneas y problemas articulares.',
                        'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=800'
                    ),
                    (
                        'transicion-segura-croquetas-a-comida-real',
                        'Transición segura: De croquetas a comida real',
                        'Cambiar de alimento seco a dieta natural requiere un proceso cuidadoso. Aquí te explicamos el paso a paso.',
                        'El sistema digestivo de un perro acostumbrado a procesados suele ser perezoso y tener un pH menos ácido. Una transición abrupta puede causar malestar estomacal. Recomendamos una transición gradual de 7 a 10 días, comenzando por introducir dieta cocinada al vapor o una proteína suave como el pollo, mezclando progresivamente con su alimento anterior. O, usar el método de ayuno de 12-24 horas (solo para perros adultos sanos) para limpiar el sistema antes de ofrecer su primera comida cruda. En Origen Canino te acompañamos durante todo el proceso.',
                        'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&q=80&w=800'
                    )
                ]
                cursor.executemany("""
                    INSERT INTO blog_posts (slug, title, excerpt, content, image)
                    VALUES (%s, %s, %s, %s, %s);
                """, default_blogs)

            cursor.execute("SELECT COUNT(*) FROM testimonials")
            if cursor.fetchone()['count'] == 0:
                default_testimonials = [
                    (
                        'Camila',
                        'Pipo',
                        'Desde que cambiamos a Origen Canino, Pipo tiene mucha más energía y su digestión mejoró increíblemente. ¡Ya no sufre del estómago y le encanta el sabor!',
                        5,
                        'approved'
                    ),
                    (
                        'Andrés',
                        'Luna',
                        'Teníamos muchos problemas de alergia en la piel con la comida seca. Empezamos con la dieta de cerdo cocinada y su pelaje está brillante y dejó de rascarse. 100% recomendado.',
                        5,
                        'approved'
                    ),
                    (
                        'Valentina',
                        'Max',
                        'Es súper práctico. Saco la porción del congelador, la caliento un poco y listo. A Max le vuelve loco y yo estoy tranquila sabiendo que come ingredientes naturales y reales.',
                        5,
                        'approved'
                    )
                ]
                cursor.executemany("""
                    INSERT INTO testimonials (owner_name, dog_name, content, rating, status)
                    VALUES (%s, %s, %s, %s, %s);
                """, default_testimonials)
        conn.commit()
    print("✅ Base de datos PostgreSQL inicializada con éxito.")

if __name__ == '__main__':
    init_database()
