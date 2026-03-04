// src/db/index.ts
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config(); // Load .env variables

// Fallbacks for local development
const DB_NAME = process.env.DB_NAME || "beauty_center";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT) || 3306;

// Sequelize instance
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  logging: false, // disable SQL logs
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Helper function to test DB connection
export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully.");
  } catch (error) {
    logger.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
}
