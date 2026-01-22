// 提示词构造服务
import logger from './logger';

const MODULE = 'Prompt';

// System Prompt - 严格 JSON 输出
export const SYSTEM_PROMPT = `你是滚动 PDCA 个人助理，帮助用户规划每日任务。

## 核心规则（必须严格遵守）
1. 只输出严格的 JSON，不得包含任何解释文本、markdown 标记或其他内容
2. Must 任务数量 ≤ 3
3. Should 任务数量 ≤ 5
4. assumptions 数量 ≤ 3

## 任务格式要求
每个任务必须：
- 动词开头（如：完成、编写、联系、整理）
- 包含预计时长（estimateMin，5-60分钟，可执行粒度）
- 包含明确的完成定义（doneDef）
- 如果用户描述模糊，拆成"15分钟可启动"的版本

## 输出 JSON 格式
{
  "date": "YYYY-MM-DD",
  "must": [
    {"id": "t1", "text": "动词开头的任务描述", "estimateMin": 15, "doneDef": "完成定义", "done": false}
  ],
  "should": [],
  "riskOfDay": {"risk": "今日主要风险", "signal": "触发信号"},
  "oneAdjustment": {"type": "goal|resource|do", "suggestion": "唯一修正建议"},
  "assumptions": ["假设1", "假设2"]
}`;

// 构造用户 Prompt
export function buildUserPrompt(transcript: string, limits?: string): string {
    logger.info(MODULE, '构造用户 Prompt', {
        transcriptLength: transcript.length,
        hasLimits: !!limits,
    });

    let prompt = `请根据以下语音转写内容，生成今日的 PDCA 计划。

## 语音转写
<<<TRANSCRIPT>>>
${transcript}
<<<END>>>`;

    if (limits) {
        prompt += `

## 今日限制
<<<LIMITS>>>
${limits}
<<<END>>>`;
    }

    prompt += `

请输出符合格式要求的 DailyPlan JSON。`;

    logger.debug(MODULE, '用户 Prompt 构造完成', { promptLength: prompt.length });
    return prompt;
}

// 构造重试 Prompt（验证失败时使用）
export function buildRetryPrompt(originalTranscript: string, errors: string[]): string {
    logger.info(MODULE, '构造重试 Prompt', { errors });

    return `之前的输出格式有问题，请重新生成。

## 错误信息
${errors.join('\n')}

## 原始语音转写
<<<TRANSCRIPT>>>
${originalTranscript}
<<<END>>>

请严格按照 JSON 格式输出，不要包含任何其他文字。`;
}

// 增强的 System Prompt（用于重试）
export const STRICT_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

⚠️ 重要提醒：
- 你的上次输出格式有误，这次必须只输出纯 JSON
- 不要添加任何解释、markdown 代码块标记或其他文字
- JSON 必须是有效的，可以直接被 JSON.parse() 解析`;
