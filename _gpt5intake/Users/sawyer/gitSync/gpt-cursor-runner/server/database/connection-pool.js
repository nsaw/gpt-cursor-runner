const { Pool } = require("pg");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database configuration
const dbConfig = {
  postgres: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "ghost_runner",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  sqlite: {
    filename:
      process.env.SQLITE_PATH ||
      path.join(__dirname, "../../data/ghost_runner.db"),
    mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  },
};

// PostgreSQL connection pool
const postgresPool = new Pool(dbConfig.postgres);

// SQLite connection
let sqliteDb = null;

// Initialize SQLite
const initSqlite = () => {
  if (!sqliteDb) {
    sqliteDb = new sqlite3.Database(dbConfig.sqlite.filename, (err) => {
      if (err) {
        console.error("SQLite connection error:", err);
      } else {
        console.log("SQLite connected successfully");
      }
    });
  }
  return sqliteDb;
};

// Query cache
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Database manager class
class DatabaseManager {
  constructor() {
    this.postgresPool = postgresPool;
    this.sqliteDb = initSqlite();
    this.cache = queryCache;
  }

  // PostgreSQL query with connection pooling
  async postgresQuery(text, params = []) {
    const client = await this.postgresPool.connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;

      console.log("PostgreSQL query executed", {
        query: text,
        duration: `${duration}ms`,
        rowCount: result.rowCount,
      });

      return result;
    } finally {
      client.release();
    }
  }

  // SQLite query with promise wrapper
  sqliteQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Cached query method
  async cachedQuery(key, queryFn, ttl = CACHE_TTL) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const data = await queryFn();
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  // Get database statistics
  async getStats() {
    const postgresStats = await this.postgresPool.query(`
      SELECT 
        count(*) as active_connections,
        max_conn as max_connections,
        used as used_connections,
        res_for_super as reserved_connections
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);

    return {
      postgres: {
        activeConnections: postgresStats.rows[0]?.active_connections || 0,
        maxConnections: postgresStats.rows[0]?.max_connections || 0,
        usedConnections: postgresStats.rows[0]?.used_connections || 0,
      },
      sqlite: {
        filename: dbConfig.sqlite.filename,
        connected: !!this.sqliteDb,
      },
      cache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()),
      },
    };
  }

  // Health check
  async healthCheck() {
    try {
      // Test PostgreSQL
      await this.postgresQuery("SELECT 1");

      // Test SQLite
      await this.sqliteQuery("SELECT 1");

      return { status: "healthy", timestamp: new Date().toISOString() };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Clear query cache
  clearCache() {
    this.cache.clear();
    return { message: "Query cache cleared" };
  }

  // Close connections
  async close() {
    await this.postgresPool.end();
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database connections...");
  await dbManager.close();
  process.exit(0);
});

module.exports = dbManager;
