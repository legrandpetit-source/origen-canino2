from backend.server_db import get_connection

with get_connection() as conn:
    cursor = conn.cursor()
    columns = [
        ("kcal_per_100g", "FLOAT DEFAULT 0"),
        ("protein_g", "FLOAT DEFAULT 0"),
        ("fat_g", "FLOAT DEFAULT 0"),
        ("fiber_g", "FLOAT DEFAULT 0"),
        ("moisture_g", "FLOAT DEFAULT 0"),
        ("ash_g", "FLOAT DEFAULT 0"),
        ("carbs_g", "FLOAT DEFAULT 0") # Adding carbs as well just in case!
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE ingredients ADD COLUMN {col_name} {col_type};")
            print(f"Added column {col_name}")
        except Exception as e:
            conn.rollback()
            print(f"Column {col_name} probably already exists: {e}")
            
    conn.commit()
    print("Migration successful.")
