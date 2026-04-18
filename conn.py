import psycopg2

DATABASE_URL = "postgresql://postgres.dxagmjmkhmbmwqplldzu:InventoryManagement.123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(DATABASE_URL)

    print("✅ Connected to Supabase PostgreSQL")

    cur = conn.cursor()
    cur.execute("SELECT version();")
    print("Database version:", cur.fetchone())

    cur.close()
    conn.close()

except Exception as e:
    print("❌ Error:", e)