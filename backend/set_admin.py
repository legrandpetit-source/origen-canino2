from passlib.context import CryptContext
from server_db import get_connection

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hash_admin = pwd_context.hash("admin")

print("Conectando a la base de datos...")
with get_connection() as conn:
    with conn.cursor() as cursor:
        # Check if 'admin' exists
        cursor.execute("SELECT id FROM admin_users WHERE email = 'admin'")
        if cursor.fetchone():
            cursor.execute("UPDATE admin_users SET password_hash = %s WHERE email = 'admin'", (hash_admin,))
        else:
            cursor.execute("INSERT INTO admin_users (email, password_hash) VALUES ('admin', %s)", (hash_admin,))
    conn.commit()

print("Admin user updated with 'admin' / 'admin'")
