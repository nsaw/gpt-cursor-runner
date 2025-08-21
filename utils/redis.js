const _Redis = require("ioredis");

class RedisManager {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = new _Redis({
        host: "127.0.0.1",
        port: 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.client.on("connect", () => {
        console.log("[REDIS] Connected to Redis server");
        this.connected = true;
      });

      this.client.on("error", (error) => {
        console.error("[REDIS] Connection error:", error);
        this.connected = false;
      });

      this.client.on("close", () => {
        console.log("[REDIS] Connection closed");
        this.connected = false;
      });

      await this.client.connect();

      // Test connection
      await this.client.ping();

      return true;
    } catch (error) {
      console.error("[REDIS] Failed to connect:", error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }

    if (ttl) {
      return await this.client.set(key, value, "EX", ttl);
    } else {
      return await this.client.set(key, value);
    }
  }

  async get(key) {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    return await this.client.get(key);
  }

  async del(key) {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    return await this.client.del(key);
  }

  async exists(key) {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    return await this.client.exists(key);
  }

  async keys(pattern) {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    return await this.client.keys(pattern);
  }

  async ping() {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    return await this.client.ping();
  }
}

// Create singleton instance
const _redisManager = new RedisManager();

// Export singleton instance
module.exports = _redisManager;

// Export class for testing
module.exports.RedisManager = RedisManager;
