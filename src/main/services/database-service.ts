import sqlite3 from "sqlite3";
import { app } from "electron";
import path from "path";
import { Logger } from "./logger-service";
import {
  SlackMessage,
  AIResponse,
  RipplingUser,
  DatabaseMessage,
  DatabaseUser,
  DatabaseAIResponse,
} from "@shared/types";

export class DatabaseService {
  private db: sqlite3.Database | null = null;
  private logger: Logger;
  private dbPath: string;

  constructor() {
    this.logger = new Logger();
    this.dbPath = path.join(app.getPath("userData"), "ai-helpdesk.db");
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error("Failed to open database:", err);
          reject(err);
          return;
        }

        this.logger.info("Database connected successfully");
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const tables = [
      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slack_id TEXT UNIQUE NOT NULL,
        channel TEXT NOT NULL,
        user TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        thread_ts TEXT,
        reply_count INTEGER DEFAULT 0,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slack_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        avatar TEXT,
        title TEXT,
        department TEXT,
        is_bot BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // AI Responses table
      `CREATE TABLE IF NOT EXISTS ai_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id TEXT UNIQUE NOT NULL,
        message_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        response TEXT NOT NULL,
        confidence REAL NOT NULL,
        tokens_used INTEGER NOT NULL,
        cost REAL NOT NULL,
        response_time INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        original_response TEXT,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages (slack_id)
      )`,

      // Rippling Users table
      `CREATE TABLE IF NOT EXISTS rippling_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        slack_user_id TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        title TEXT,
        department TEXT,
        manager TEXT,
        start_date TEXT,
        status TEXT NOT NULL,
        work_location TEXT,
        phone_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Device information table
      `CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        operating_system TEXT NOT NULL,
        os_version TEXT NOT NULL,
        model TEXT NOT NULL,
        serial_number TEXT,
        mac_address TEXT,
        ip_address TEXT,
        last_seen TEXT NOT NULL,
        specifications TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES rippling_users (employee_id)
      )`,

      // Applications table
      `CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        vendor TEXT NOT NULL,
        install_date TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices (device_id)
      )`,
    ];

    for (const tableSQL of tables) {
      await this.runQuery(tableSQL);
    }

    this.logger.info("Database tables created successfully");
  }

  private runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  private allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Message operations
  public async saveMessage(message: SlackMessage): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO messages 
        (slack_id, channel, user, text, timestamp, thread_ts, reply_count, type, priority, category, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.runQuery(sql, [
        message.id,
        message.channel,
        message.user,
        message.text,
        message.timestamp,
        message.thread_ts || null,
        message.reply_count || 0,
        message.type,
        message.priority,
        message.category,
        message.status,
      ]);

      this.logger.debug("Message saved to database:", message.id);
    } catch (error) {
      this.logger.error("Failed to save message:", error);
      throw error;
    }
  }

  public async getMessages(filters?: any): Promise<SlackMessage[]> {
    try {
      let sql = `
        SELECT slack_id as id, channel, user, text, timestamp, thread_ts, reply_count, type, priority, category, status
        FROM messages
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.status) {
        sql += " AND status = ?";
        params.push(filters.status);
      }

      if (filters?.priority) {
        sql += " AND priority = ?";
        params.push(filters.priority);
      }

      if (filters?.category) {
        sql += " AND category = ?";
        params.push(filters.category);
      }

      if (filters?.limit) {
        sql += " LIMIT ?";
        params.push(filters.limit);
      }

      sql += " ORDER BY timestamp DESC";

      const rows = await this.allQuery(sql, params);
      return rows.map((row) => ({
        ...row,
        priority: row.priority,
        category: row.category,
        status: row.status,
        type: row.type,
        files: [],
        reactions: [],
      }));
    } catch (error) {
      this.logger.error("Failed to get messages:", error);
      throw error;
    }
  }

  public async clearAllMessages(): Promise<void> {
    try {
      await this.runQuery("DELETE FROM messages");
      this.logger.info("All messages cleared from database");
    } catch (error) {
      this.logger.error("Failed to clear messages:", error);
      throw error;
    }
  }

  // AI Response operations
  public async saveAIResponse(response: AIResponse): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO ai_responses 
        (response_id, message_id, provider, model, response, confidence, tokens_used, cost, response_time, timestamp, is_edited, original_response, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.runQuery(sql, [
        response.id,
        response.messageId,
        response.provider.name,
        response.model,
        response.response,
        response.confidence,
        response.tokensUsed,
        response.cost,
        response.responseTime,
        response.timestamp,
        response.isEdited,
        response.originalResponse || null,
        response.status,
      ]);

      this.logger.debug("AI response saved to database:", response.id);
    } catch (error) {
      this.logger.error("Failed to save AI response:", error);
      throw error;
    }
  }

  public async getAIResponses(messageId: string): Promise<AIResponse[]> {
    try {
      const sql = `
        SELECT * FROM ai_responses 
        WHERE message_id = ? 
        ORDER BY timestamp DESC
      `;

      const rows = await this.allQuery(sql, [messageId]);
      return rows.map((row) => ({
        id: row.response_id,
        messageId: row.message_id,
        provider: { name: row.provider } as any,
        model: row.model,
        response: row.response,
        confidence: row.confidence,
        tokensUsed: row.tokens_used,
        cost: row.cost,
        responseTime: row.response_time,
        timestamp: row.timestamp,
        isEdited: row.is_edited,
        originalResponse: row.original_response,
        status: row.status,
      }));
    } catch (error) {
      this.logger.error("Failed to get AI responses:", error);
      throw error;
    }
  }

  // User operations
  public async saveUser(user: any): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO users 
        (slack_id, name, email, avatar, title, department, is_bot, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.runQuery(sql, [
        user.id,
        user.name,
        user.email || null,
        user.avatar || null,
        user.title || null,
        user.department || null,
        user.isBot || false,
      ]);

      this.logger.debug("User saved to database:", user.id);
    } catch (error) {
      this.logger.error("Failed to save user:", error);
      throw error;
    }
  }

  public async getUser(slackId: string): Promise<any | null> {
    try {
      const sql = `
        SELECT slack_id as id, name, email, avatar, title, department, is_bot as isBot
        FROM users 
        WHERE slack_id = ?
      `;

      const row = await this.getQuery(sql, [slackId]);
      return row || null;
    } catch (error) {
      this.logger.error("Failed to get user:", error);
      throw error;
    }
  }

  // Rippling user operations
  public async saveRipplingUser(user: RipplingUser): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO rippling_users 
        (employee_id, slack_user_id, first_name, last_name, email, title, department, manager, start_date, status, work_location, phone_number, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.runQuery(sql, [
        user.id,
        user.email, // We'll use email to match with Slack users
        user.firstName,
        user.lastName,
        user.email,
        user.title,
        user.department,
        user.manager || null,
        user.startDate,
        user.status,
        user.workLocation,
        user.phoneNumber || null,
      ]);

      this.logger.debug("Rippling user saved to database:", user.id);
    } catch (error) {
      this.logger.error("Failed to save Rippling user:", error);
      throw error;
    }
  }

  public async getRipplingUser(email: string): Promise<RipplingUser | null> {
    try {
      const sql = `
        SELECT * FROM rippling_users 
        WHERE email = ?
      `;

      const row = await this.getQuery(sql, [email]);
      if (!row) return null;

      return {
        id: row.employee_id,
        employeeId: row.employee_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        title: row.title,
        department: row.department,
        manager: row.manager,
        startDate: row.start_date,
        status: row.status,
        workLocation: row.work_location,
        phoneNumber: row.phone_number,
        devices: [], // TODO: Load devices
      };
    } catch (error) {
      this.logger.error("Failed to get Rippling user:", error);
      throw error;
    }
  }

  // Close database connection
  public async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            this.logger.error("Error closing database:", err);
          } else {
            this.logger.info("Database connection closed");
          }
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Cleanup old data
  public async cleanup(retentionDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const sql = `
        DELETE FROM messages 
        WHERE created_at < datetime(?)
      `;

      const result = await this.runQuery(sql, [cutoffDate.toISOString()]);
      this.logger.info(`Cleaned up ${result.changes} old messages`);
    } catch (error) {
      this.logger.error("Failed to cleanup old data:", error);
      throw error;
    }
  }

  // Get analytics data
  public async getAnalytics(days: number = 30): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const [messageStats, responseStats, categoryStats] = await Promise.all([
        this.getQuery(
          `
          SELECT 
            COUNT(*) as total_messages,
            COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded_messages,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_messages
          FROM messages 
          WHERE created_at >= datetime(?)
        `,
          [cutoffDate.toISOString()]
        ),

        this.getQuery(
          `
          SELECT 
            COUNT(*) as total_responses,
            AVG(response_time) as avg_response_time,
            AVG(confidence) as avg_confidence,
            SUM(cost) as total_cost
          FROM ai_responses 
          WHERE created_at >= datetime(?)
        `,
          [cutoffDate.toISOString()]
        ),

        this.allQuery(
          `
          SELECT 
            category,
            COUNT(*) as count,
            AVG(CASE WHEN status = 'responded' THEN 1.0 ELSE 0.0 END) as success_rate
          FROM messages 
          WHERE created_at >= datetime(?)
          GROUP BY category
          ORDER BY count DESC
        `,
          [cutoffDate.toISOString()]
        ),
      ]);

      return {
        totalMessages: messageStats?.total_messages || 0,
        respondedMessages: messageStats?.responded_messages || 0,
        pendingMessages: messageStats?.pending_messages || 0,
        totalResponses: responseStats?.total_responses || 0,
        averageResponseTime: responseStats?.avg_response_time || 0,
        averageConfidence: responseStats?.avg_confidence || 0,
        totalCost: responseStats?.total_cost || 0,
        categoryStats: categoryStats || [],
      };
    } catch (error) {
      this.logger.error("Failed to get analytics:", error);
      throw error;
    }
  }
}
