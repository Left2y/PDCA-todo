// 核心类型定义

// 任务
export interface Task {
    id: string;
    text: string;           // 动词开头的任务描述
    estimateMin: number;    // 预计分钟数
    doneDef: string;        // 完成定义
    done: boolean;          // 是否完成
}

// 今日风险
export interface RiskOfDay {
    risk: string;           // 风险描述
    signal: string;         // 触发信号
}

// 修正建议
export interface OneAdjustment {
    type: 'goal' | 'resource' | 'do';
    suggestion: string;
}

// 日计划 - LLM 输出的核心结构
export interface DailyPlan {
    title?: string;                  // 事项标题
    date: string;                    // YYYY-MM-DD
    must: Task[];                    // Must ≤ 3
    should: Task[];                  // Should ≤ 5
    riskOfDay: RiskOfDay;
    oneAdjustment: OneAdjustment;
    assumptions: string[];           // assumptions ≤ 3
}

// 事项卡 - 每一个录音生成一个独立的事项卡
export interface IssueCard {
    id: string;
    title: string;          // AI 提取的事项标题
    createdAt: string;      // 创建时间
    plan: DailyPlan;        // 该事项的 PDCA 拆解
}

// 每日事项卡集合
export interface DailyCards {
    date: string;           // YYYY-MM-DD
    cards: IssueCard[];
}

// 处理状态

// 周计划
export interface WeeklyPlan {
    weekStart: string;              // YYYY-MM-DD (Monday)
    goals: string[];                // 本周目标
    must: Task[];                   // 本周必须完成
    should: Task[];                 // 本周建议完成
    feedback?: string;              // 执行反馈
    adjustments?: string;           // 目标修正
    riskOfWeek: RiskOfDay;
    oneAdjustment: OneAdjustment;
}

// 会话日志
export interface SessionLog {
    id: string;
    createdAt: string;               // ISO timestamp
    transcript: string;              // 转写文本
    plan: DailyPlan | null;          // 生成的计划
    audioRef?: string;               // 音频引用（可选）
    rawResponse?: string;            // LLM 原始响应（用于调试）
}

// 应用设置
export interface AppSettings {
    apiKey: string;
    baseUrl: string;
    asrModel: string;
    llmModel: string;
    saveAudio: boolean;              // 是否保存音频
}

// 默认设置
export const DEFAULT_SETTINGS: AppSettings = {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    asrModel: 'qwen3-asr-flash',
    llmModel: 'qwen-plus',
    saveAudio: false,
};

// 处理状态
export type ProcessingStep = 'idle' | 'recording' | 'transcribing' | 'generating' | 'validating' | 'done' | 'error';

export interface ProcessingState {
    step: ProcessingStep;
    message: string;
    error?: string;
}
