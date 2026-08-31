from sqlalchemy import create_engine
import psycopg2.extras

try:
    engine = create_engine(
        "postgresql://fake:fake@localhost/fake",
        connect_args={'cursor_factory': psycopg2.extras.RealDictCursor}
    )
    print("Engine created successfully")
except Exception as e:
    print("Error:", e)
