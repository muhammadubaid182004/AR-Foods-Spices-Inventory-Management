import "dotenv/config";
import mysql from "mysql2/promise";

async function testMySQLConnection() {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }

    const connection = await mysql.createConnection(databaseUrl);

    console.log("✅ Successfully connected to MySQL database!");

    // Test query to fetch regions
    const [rows] = await connection.execute("SELECT * FROM regions LIMIT 5");
    console.log("\n📊 Sample regions from database:");
    console.log(rows);

    // Test query to fetch shops
    const [shops] = await connection.execute("SELECT * FROM shops LIMIT 5");
    console.log("\n🏪 Sample shops from database:");
    console.log(shops);

    // Test query to fetch items
    const [items] = await connection.execute("SELECT * FROM items LIMIT 5");
    console.log("\n📦 Sample items from database:");
    console.log(items);

    await connection.end();
    console.log("\n✅ Connection closed successfully");
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  }
}

testMySQLConnection();
