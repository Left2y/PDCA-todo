// SQLite 数据库模块 (better-sqlite3)
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');

let db: Database.Database | null = null;

function initSchema(database: Database.Database): void {
    database.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            transcript TEXT,
            dailyPlanJson TEXT,
            cardsJson TEXT,
            createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS daily_plans (
            date TEXT PRIMARY KEY,
            json TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS weekly_plans (
            weekStart TEXT PRIMARY KEY,
            json TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS weekly_logs (
            id TEXT PRIMARY KEY,
            weekStart TEXT NOT NULL,
            transcript TEXT,
            weeklyPlanJson TEXT,
            createdAt TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
        CREATE INDEX IF NOT EXISTS idx_weekly_logs_date ON weekly_logs(weekStart);
    `);

    // 迁移：如果表已存在但没有新字段，尝试添加 (忽略已存在的错误)
    try {
        database.exec('ALTER TABLE logs ADD COLUMN cardsJson TEXT;');
        console.log('[DB] Migration: Added cardsJson to logs table');
    } catch {
        // 字段可能已存在
    }
}

// 初始化数据库
export async function getDb(): Promise<Database.Database> {
    if (db) return db;

    try {
        console.log(`[DB] Initializing database. Current CWD: ${process.cwd()}`);
        console.log(`[DB] Target DB Path: ${DB_PATH}`);

        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            console.log(`[DB] Creating database directory: ${dbDir}`);
            fs.mkdirSync(dbDir, { recursive: true });
        }

        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('synchronous = NORMAL');

        initSchema(db);

        return db;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// 获取某日的计划
export async function getDailyPlan(date: string): Promise<unknown | null> {
    const database = await getDb();
    const row = database
        .prepare('SELECT json FROM daily_plans WHERE date = ?')
        .get(date) as { json: string } | undefined;

    if (!row) return null;

    try {
        return JSON.parse(row.json);
    } catch {
        return null;
    }
}

// 保存或更新计划
export async function saveDailyPlan(date: string, plan: unknown): Promise<void> {
    try {
        const database = await getDb();
        const json = JSON.stringify(plan);
        const now = new Date().toISOString();

        database.prepare(`
            INSERT OR REPLACE INTO daily_plans (date, json, updatedAt)
            VALUES (?, ?, ?)
        `).run(date, json, now);
    } catch (error) {
        console.error(`[DB] Error in saveDailyPlan for date ${date}:`, error);
        throw error;
    }
}

// 获取某周的计划
export async function getWeeklyPlan(weekStart: string): Promise<any | null> {
    const database = await getDb();
    const row = database
        .prepare('SELECT json FROM weekly_plans WHERE weekStart = ?')
        .get(weekStart) as { json: string } | undefined;

    if (!row) return null;

    try {
        return JSON.parse(row.json);
    } catch {
        return null;
    }
}

// 保存或更新周计划
export async function saveWeeklyPlan(weekStart: string, plan: any): Promise<void> {
    const database = await getDb();
    const json = JSON.stringify(plan);
    const now = new Date().toISOString();

    database.prepare(`
        INSERT OR REPLACE INTO weekly_plans (weekStart, json, updatedAt)
        VALUES (?, ?, ?)
    `).run(weekStart, json, now);
}

// 删除某周计划
export async function deleteWeeklyPlan(weekStart: string): Promise<void> {
    const database = await getDb();
    database.prepare('DELETE FROM weekly_plans WHERE weekStart = ?').run(weekStart);
}

// 保存日志
export async function saveLog(log: {
    id: string;
    date: string;
    transcript: string;
    dailyPlan: unknown;
    cards?: unknown[];
}): Promise<void> {
    try {
        const database = await getDb();
        const now = new Date().toISOString();

        console.log(`[DB] Attempting to save log for ${log.date}. ID: ${log.id}`);

        database.prepare(`
            INSERT INTO logs (id, date, transcript, dailyPlanJson, cardsJson, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            log.id,
            log.date,
            log.transcript,
            JSON.stringify(log.dailyPlan),
            JSON.stringify(log.cards || []),
            now
        );

        // 同时更新 daily_plans
        await saveDailyPlan(log.date, log.dailyPlan);

        console.log(`[DB] Log saved successfully for ${log.date}`);
    } catch (error) {
        console.error(`[DB] Error in saveLog for date ${log.date}:`, error);
        throw error;
    }
}

// 获取某日的日志
export async function getLogsByDate(date: string): Promise<{
    logs: { id: string; transcript: string; createdAt: string }[];
    dailyPlan: unknown | null;
}> {
    const database = await getDb();

    const logs = database.prepare(`
        SELECT id, transcript, createdAt FROM logs WHERE date = ? ORDER BY createdAt DESC
    `).all(date) as { id: string; transcript: string; createdAt: string }[];

    const dailyPlan = await getDailyPlan(date);

    return { logs, dailyPlan };
}

// 保存周日志
export async function saveWeeklyLog(log: {
    id: string;
    weekStart: string;
    transcript: string;
    weeklyPlan: unknown;
}): Promise<void> {
    const database = await getDb();
    const now = new Date().toISOString();

    database.prepare(`
        INSERT INTO weekly_logs (id, weekStart, transcript, weeklyPlanJson, createdAt)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        log.id,
        log.weekStart,
        log.transcript,
        JSON.stringify(log.weeklyPlan),
        now
    );

    // 同时更新 weekly_plans
    await saveWeeklyPlan(log.weekStart, log.weeklyPlan);
}

// 获取某周的日志
export async function getWeeklyLogsByWeek(weekStart: string): Promise<{
    logs: { id: string; transcript: string; createdAt: string }[];
    weeklyPlan: unknown | null;
}> {
    const database = await getDb();

    const logs = database.prepare(`
        SELECT id, transcript, createdAt FROM weekly_logs WHERE weekStart = ? ORDER BY createdAt DESC
    `).all(weekStart) as { id: string; transcript: string; createdAt: string }[];

    const weeklyPlan = await getWeeklyPlan(weekStart);

    return { logs, weeklyPlan };
}

// 更新任务状态
export async function updateTaskDone(
    date: string,
    taskId: string,
    done: boolean
): Promise<unknown | null> {
    const plan = await getDailyPlan(date) as { must?: { id: string; done: boolean }[]; should?: { id: string; done: boolean }[] } | null;
    if (!plan) return null;

    // 在 must 和 should 中查找任务
    let found = false;

    if (plan.must) {
        for (const task of plan.must) {
            if (task.id === taskId) {
                task.done = done;
                found = true;
                break;
            }
        }
    }

    if (!found && plan.should) {
        for (const task of plan.should) {
            if (task.id === taskId) {
                task.done = done;
                break;
            }
        }
    }

    await saveDailyPlan(date, plan);
    return plan;
}

// 导出所有数据
export async function exportAll(): Promise<{
    logs: unknown[];
    daily_plans: unknown[];
    exportedAt: string;
}> {
    const database = await getDb();

    const logs = database.prepare('SELECT * FROM logs ORDER BY createdAt DESC').all();
    const daily_plans = database.prepare('SELECT * FROM daily_plans ORDER BY date DESC').all();

    return {
        logs,
        daily_plans,
        exportedAt: new Date().toISOString(),
    };
}

// 导入数据
export async function importAll(data: {
    logs?: { id: string; date: string; transcript: string; dailyPlanJson: string; cardsJson: string; createdAt: string }[];
    daily_plans?: { date: string; json: string; updatedAt: string }[];
}): Promise<void> {
    const database = await getDb();

    const importTx = database.transaction((payload: typeof data) => {
        // 清空现有数据
        database.exec('DELETE FROM logs;');
        database.exec('DELETE FROM daily_plans;');

        // 导入日志
        if (payload.logs) {
            const insertLog = database.prepare(`
                INSERT INTO logs (id, date, transcript, dailyPlanJson, cardsJson, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const log of payload.logs) {
                insertLog.run(log.id, log.date, log.transcript, log.dailyPlanJson, log.cardsJson, log.createdAt);
            }
        }

        // 导入计划
        if (payload.daily_plans) {
            const insertPlan = database.prepare(`
                INSERT INTO daily_plans (date, json, updatedAt)
                VALUES (?, ?, ?)
            `);
            for (const plan of payload.daily_plans) {
                insertPlan.run(plan.date, plan.json, plan.updatedAt);
            }
        }
    });

    importTx(data);
}
