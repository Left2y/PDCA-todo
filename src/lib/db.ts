// SQLite 数据库模块 (使用 sql.js)
import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');

let db: Database | null = null;

// 初始化数据库
export async function getDb(): Promise<Database> {
    if (db) return db;

    try {
        console.log(`[DB] Initializing database. Current CWD: ${process.cwd()}`);
        console.log(`[DB] Target DB Path: ${DB_PATH}`);

        // For Node.js/Next.js server-side, we need to locate the WASM file
        const SQL = await initSqlJs({
            locateFile: (file: string) => {
                const possiblePaths = [
                    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
                    path.join(process.cwd(), '.next', 'standalone', 'node_modules', 'sql.js', 'dist', file),
                    path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
                    file // fallback to default
                ];

                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        console.log(`[DB] Found WASM at: ${p}`);
                        return p;
                    }
                }

                console.warn(`[DB] WASM file not found in common paths, falling back to: ${file}`);
                return file;
            }
        });

        // 检查数据库文件是否存在
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            console.log(`[DB] Creating database directory: ${dbDir}`);
            fs.mkdirSync(dbDir, { recursive: true });
        }

        if (fs.existsSync(DB_PATH)) {
            console.log(`[DB] Loading existing database from: ${DB_PATH}`);
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
        } else {
            console.log(`[DB] Creating new database instance`);
            db = new SQL.Database();
        }

        // 创建表 (包含所有最新字段)
        db.run(`
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                transcript TEXT,
                dailyPlanJson TEXT,
                cardsJson TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        // 迁移：如果表已存在但没有新字段，尝试添加 (忽略已存在的错误)
        try {
            db.run("ALTER TABLE logs ADD COLUMN cardsJson TEXT;");
            console.log("[DB] Migration: Added cardsJson to logs table");
        } catch (e) {
            // 字段可能已存在
        }

        db.run(`
            CREATE TABLE IF NOT EXISTS daily_plans (
                date TEXT PRIMARY KEY,
                json TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS weekly_plans (
                weekStart TEXT PRIMARY KEY,
                json TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS weekly_logs (
                id TEXT PRIMARY KEY,
                weekStart TEXT NOT NULL,
                transcript TEXT,
                weeklyPlanJson TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date)
        `);

        db.run(`
            CREATE INDEX IF NOT EXISTS idx_weekly_logs_date ON weekly_logs(weekStart)
        `);

        // 保存数据库
        saveDb();

        return db;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// 保存数据库到文件
export function saveDb(): void {
    if (!db) return;

    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    } catch (error) {
        console.error('Failed to save database:', error);
    }
}

// 获取某日的计划
export async function getDailyPlan(date: string): Promise<unknown | null> {
    const database = await getDb();
    const result = database.exec(`SELECT json FROM daily_plans WHERE date = ?`, [date]);

    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    try {
        return JSON.parse(result[0].values[0][0] as string);
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

        database.run(`
            INSERT OR REPLACE INTO daily_plans (date, json, updatedAt)
            VALUES (?, ?, ?)
        `, [date, json, now]);

        saveDb();
    } catch (error) {
        console.error(`[DB] Error in saveDailyPlan for date ${date}:`, error);
        throw error;
    }
}

// 获取某周的计划
export async function getWeeklyPlan(weekStart: string): Promise<any | null> {
    const database = await getDb();
    const result = database.exec(`SELECT json FROM weekly_plans WHERE weekStart = ?`, [weekStart]);

    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    try {
        return JSON.parse(result[0].values[0][0] as string);
    } catch {
        return null;
    }
}

// 保存或更新周计划
export async function saveWeeklyPlan(weekStart: string, plan: any): Promise<void> {
    const database = await getDb();
    const json = JSON.stringify(plan);
    const now = new Date().toISOString();

    database.run(`
        INSERT OR REPLACE INTO weekly_plans (weekStart, json, updatedAt)
        VALUES (?, ?, ?)
    `, [weekStart, json, now]);

    saveDb();
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

        database.run(`
            INSERT INTO logs (id, date, transcript, dailyPlanJson, cardsJson, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            log.id,
            log.date,
            log.transcript,
            JSON.stringify(log.dailyPlan),
            JSON.stringify(log.cards || []),
            now,
        ]);

        // 同时更新 daily_plans
        await saveDailyPlan(log.date, log.dailyPlan);

        saveDb();
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

    const logsResult = database.exec(`
        SELECT id, transcript, createdAt FROM logs WHERE date = ? ORDER BY createdAt DESC
    `, [date]);

    const logs = logsResult.length > 0
        ? logsResult[0].values.map(row => ({
            id: row[0] as string,
            transcript: row[1] as string,
            createdAt: row[2] as string,
        }))
        : [];

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

    database.run(`
        INSERT INTO weekly_logs (id, weekStart, transcript, weeklyPlanJson, createdAt)
        VALUES (?, ?, ?, ?, ?)
    `, [
        log.id,
        log.weekStart,
        log.transcript,
        JSON.stringify(log.weeklyPlan),
        now,
    ]);

    // 同时更新 weekly_plans
    await saveWeeklyPlan(log.weekStart, log.weeklyPlan);

    saveDb();
}

// 获取某周的日志
export async function getWeeklyLogsByWeek(weekStart: string): Promise<{
    logs: { id: string; transcript: string; createdAt: string }[];
    weeklyPlan: unknown | null;
}> {
    const database = await getDb();

    const logsResult = database.exec(`
        SELECT id, transcript, createdAt FROM weekly_logs WHERE weekStart = ? ORDER BY createdAt DESC
    `, [weekStart]);

    const logs = logsResult.length > 0
        ? logsResult[0].values.map(row => ({
            id: row[0] as string,
            transcript: row[1] as string,
            createdAt: row[2] as string,
        }))
        : [];

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

    const logsResult = database.exec(`SELECT * FROM logs ORDER BY createdAt DESC`);
    const logs = logsResult.length > 0
        ? logsResult[0].values.map(row => ({
            id: row[0],
            date: row[1],
            transcript: row[2],
            dailyPlanJson: row[3],
            cardsJson: row[4],
            createdAt: row[5],
        }))
        : [];

    const plansResult = database.exec(`SELECT * FROM daily_plans ORDER BY date DESC`);
    const daily_plans = plansResult.length > 0
        ? plansResult[0].values.map(row => ({
            date: row[0],
            json: row[1],
            updatedAt: row[2],
        }))
        : [];

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

    // 清空现有数据
    database.run(`DELETE FROM logs`);
    database.run(`DELETE FROM daily_plans`);

    // 导入日志
    if (data.logs) {
        for (const log of data.logs) {
            database.run(`
                INSERT INTO logs (id, date, transcript, dailyPlanJson, cardsJson, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [log.id, log.date, log.transcript, log.dailyPlanJson, log.cardsJson, log.createdAt]);
        }
    }

    // 导入计划
    if (data.daily_plans) {
        for (const plan of data.daily_plans) {
            database.run(`
                INSERT INTO daily_plans (date, json, updatedAt)
                VALUES (?, ?, ?)
            `, [plan.date, plan.json, plan.updatedAt]);
        }
    }

    saveDb();
}
