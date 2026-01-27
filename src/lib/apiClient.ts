// API 客户端 - 调用同域 API
import logger from './logger';
import type { DailyPlan, WeeklyPlan, SessionLog, IssueCard } from '@/types/plan';

const MODULE = 'ApiClient';

// 保存会话日志
export async function saveLogs(
    data: {
        date: string;
        transcript: string;
        dailyPlan: DailyPlan | IssueCard[];
    },
    options?: { keepalive?: boolean }
): Promise<{ id: string; saved: boolean }> {
    logger.info(MODULE, '保存会话日志', { date: data.date });

    const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: options?.keepalive ?? false,
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '保存日志失败', { error });
        throw new Error(`保存失败: ${response.status}`);
    }

    return response.json();
}

// 获取某日的日志
export async function getLogs(date: string): Promise<{
    date: string;
    dailyPlan: DailyPlan | IssueCard[] | null;
    logs: SessionLog[];
}> {
    logger.info(MODULE, '获取日志', { date });

    const response = await fetch(`/api/logs?date=${date}`, { cache: 'no-store' });

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '获取日志失败', { error });
        throw new Error(`获取失败: ${response.status}`);
    }

    return response.json();
}

// 获取某日的计划
export async function getDailyPlan(date: string): Promise<DailyPlan | null> {
    logger.info(MODULE, '获取日计划', { date });

    const response = await fetch(`/api/daily-plans/${date}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '获取计划失败', { error });
        throw new Error(`获取失败: ${response.status}`);
    }

    return response.json();
}

// 更新任务状态
export async function updateTaskDone(
    date: string,
    taskId: string,
    done: boolean
): Promise<{ ok: boolean; dailyPlan: DailyPlan }> {
    logger.info(MODULE, '更新任务状态', { date, taskId, done });

    const response = await fetch(`/api/daily-plans/${date}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '更新任务失败', { error });
        throw new Error(`更新失败: ${response.status}`);
    }

    return response.json();
}

// 导出数据
export async function exportData(): Promise<{
    logs: unknown[];
    daily_plans: unknown[];
    exportedAt: string;
}> {
    logger.info(MODULE, '导出数据');

    const response = await fetch('/api/export');

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '导出失败', { error });
        throw new Error(`导出失败: ${response.status}`);
    }

    return response.json();
}

// 导入数据
export async function importData(data: unknown): Promise<{ imported: boolean }> {
    logger.info(MODULE, '导入数据');

    const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '导入失败', { error });
        throw new Error(`导入失败: ${response.status}`);
    }

    return response.json();
}

// 保存周日志
export async function saveWeeklyLogs(data: {
    weekStart: string;
    transcript: string;
    weeklyPlan: WeeklyPlan;
}): Promise<{ id: string; saved: boolean }> {
    logger.info(MODULE, '保存周会话日志', { weekStart: data.weekStart });

    const response = await fetch('/api/weekly-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '保存周日志失败', { error });
        throw new Error(`保存失败: ${response.status}`);
    }

    return response.json();
}

// 获取某周的日志
export async function getWeeklyLogs(weekStart: string): Promise<{
    weekStart: string;
    weeklyPlan: WeeklyPlan | null;
    logs: SessionLog[];
}> {
    logger.info(MODULE, '获取周日志', { weekStart });

    const response = await fetch(`/api/weekly-logs?weekStart=${weekStart}`);

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '获取周日志失败', { error });
        throw new Error(`获取失败: ${response.status}`);
    }

    return response.json();
}

// 获取某周的计划
export async function getWeeklyPlan(weekStart: string): Promise<WeeklyPlan | null> {
    logger.info(MODULE, '获取周计划', { weekStart });

    const response = await fetch(`/api/weekly-plans/${weekStart}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        const error = await response.text();
        logger.error(MODULE, '获取周计划失败', { error });
        throw new Error(`获取失败: ${response.status}`);
    }

    return response.json();
}

// 健康检查
export async function healthCheck(): Promise<{ ok: boolean; time: string }> {
    const response = await fetch('/api/health');
    return response.json();
}
