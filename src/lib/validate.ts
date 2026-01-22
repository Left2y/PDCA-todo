// Zod 校验器 - DailyPlan 结构验证
import { z } from 'zod';
import logger from './logger';
import type { DailyPlan } from '@/types/plan';

const MODULE = 'Validate';

// Task Schema
const TaskSchema = z.object({
    id: z.string().min(1, '任务 ID 不能为空'),
    text: z.string().min(1, '任务描述不能为空'),
    estimateMin: z.number().int().positive('预计时间必须为正整数'),
    doneDef: z.string().min(1, '完成定义不能为空'),
    done: z.boolean(),
});

// RiskOfDay Schema
const RiskOfDaySchema = z.object({
    risk: z.string(),
    signal: z.string(),
});

// OneAdjustment Schema
const OneAdjustmentSchema = z.object({
    type: z.enum(['goal', 'resource', 'do']),
    suggestion: z.string(),
});

// DailyPlan Schema - 包含硬规则验证
export const DailyPlanSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
    must: z.array(TaskSchema).max(3, 'Must 任务不能超过 3 个'),
    should: z.array(TaskSchema).max(5, 'Should 任务不能超过 5 个'),
    riskOfDay: RiskOfDaySchema,
    oneAdjustment: OneAdjustmentSchema,
    assumptions: z.array(z.string()).max(3, 'assumptions 不能超过 3 个'),
});

export interface ValidationResult {
    success: boolean;
    data?: DailyPlan;
    errors?: string[];
    rawInput?: string;
}

// 解析并验证 DailyPlan
export function validateDailyPlan(input: unknown): ValidationResult {
    logger.info(MODULE, '开始验证 DailyPlan');
    logger.debug(MODULE, '输入数据', { input });

    try {
        const result = DailyPlanSchema.safeParse(input);

        if (result.success) {
            logger.info(MODULE, '验证通过', { date: result.data.date });
            return {
                success: true,
                data: result.data as DailyPlan,
            };
        } else {
            const errors = result.error.issues.map(issue => {
                const path = issue.path.join('.');
                return `${path}: ${issue.message}`;
            });

            logger.warn(MODULE, '验证失败', { errors });
            return {
                success: false,
                errors,
                rawInput: JSON.stringify(input),
            };
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知验证错误';
        logger.error(MODULE, '验证异常', { error: errorMsg });
        return {
            success: false,
            errors: [errorMsg],
            rawInput: typeof input === 'string' ? input : JSON.stringify(input),
        };
    }
}

// 从 LLM 响应中提取 JSON
export function extractJsonFromResponse(response: string): unknown | null {
    logger.debug(MODULE, '从响应中提取 JSON', { responseLength: response.length });

    // 尝试直接解析
    try {
        const parsed = JSON.parse(response.trim());
        logger.info(MODULE, '直接解析 JSON 成功');
        return parsed;
    } catch {
        logger.debug(MODULE, '直接解析失败，尝试提取 JSON 块');
    }

    // 尝试从 markdown 代码块中提取
    const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            const parsed = JSON.parse(jsonBlockMatch[1].trim());
            logger.info(MODULE, '从代码块提取 JSON 成功');
            return parsed;
        } catch (error) {
            logger.warn(MODULE, '代码块 JSON 解析失败', { error });
        }
    }

    // 尝试找到 JSON 对象
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            logger.info(MODULE, '正则提取 JSON 成功');
            return parsed;
        } catch (error) {
            logger.warn(MODULE, '正则提取 JSON 解析失败', { error });
        }
    }

    logger.error(MODULE, '无法从响应中提取有效 JSON');
    return null;
}

// 完整的验证流程
export function parseAndValidatePlan(response: string): ValidationResult {
    logger.info(MODULE, '开始解析并验证计划');

    const jsonData = extractJsonFromResponse(response);

    if (jsonData === null) {
        return {
            success: false,
            errors: ['无法从 LLM 响应中提取有效的 JSON'],
            rawInput: response,
        };
    }

    return validateDailyPlan(jsonData);
}
