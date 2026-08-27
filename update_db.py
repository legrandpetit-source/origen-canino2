import sqlite3
import json
import os

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'origen_database.sqlite')
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# 1. Add is_subscription column (ignore if it already exists)
try:
    cursor.execute("ALTER TABLE orders ADD COLUMN is_subscription INTEGER DEFAULT 0")
    print("Added is_subscription to orders table")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Column is_subscription already exists")
    else:
        raise

# 2. Update existing product price
cursor.execute("UPDATE products SET price = 8000 WHERE id = 2")
print("Updated price for product 2")

# 3. Insert Pack Inicia
# Let's check if it already exists to avoid duplicates
cursor.execute("SELECT COUNT(*) FROM products WHERE name LIKE 'Pack Inicia%'")
if cursor.fetchone()[0] == 0:
    cursor.execute("""
        INSERT INTO products (name, type, price, weight, description, ingredients, benefits, image, is_new)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'Pack Inicia (Cerdo)',
        'cocinada',
        6990,
        '1 Kg',
        'El formato perfecto para probar la dieta cocinada por primera vez. Ideal para la transición.',
        json.dumps(['Cerdo magro', 'Arroz integral', 'Zanahoria', 'Zapallo', 'Suplementos']),
        json.dumps(['Ideal para probar', 'Fácil digestión', 'Transición segura']),
        'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=500&auto=format&fit=crop&q=60',
        1
    ))
    print("Inserted Pack Inicia")

conn.commit()
conn.close()
print("Database migration complete.")
