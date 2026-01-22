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
    date: string;                    // YYYY-MM-DD
    must: Task[];                    // Must ≤ 3
    should: Task[];                  // Should ≤ 5
    riskOfDay: RiskOfDay;
    oneAdjustment: OneAdjustment;
    assumptions: string[];           // assumptions ≤ 3
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
    asrModel: 'paraformer-realtime-v2',
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
