// 提示词构造服务
import logger from './logger';

const MODULE = 'Prompt';

// System Prompt - 严格 JSON 输出
export const SYSTEM_PROMPT = `你是滚动 PDCA 个人助理，帮助用户将每一段语音转换为一个“事项卡”。

## 核心规则
1. 只输出严格的 JSON
2. 为该事项提取一个 2-10 字的简短标题 (title)
3. Must 任务 ≤ 3（针对该事项的拆解）
4. Should 任务 ≤ 5
5. 如果用户描述模糊，请将其拆解为 15-30 分钟的可启动任务
6. **所有输出内容（标题、任务描述、建议等）必须使用中文（简体）**

## 输出 JSON 格式
{
  "title": "事项简短标题",
  "date": "YYYY-MM-DD",
  "must": [
    {"id": "t1", "text": "动词开头的任务描述", "estimateMin": 15, "doneDef": "完成定义", "done": false}
  ],
  "should": [],
  "riskOfDay": {"risk": "该事项主要风险", "signal": "触发信号"},
  "oneAdjustment": {"type": "goal|resource|do", "suggestion": "针对该事项的建议"},
  "assumptions": ["假设1"]
}`;

// 周计划 System Prompt
export const WEEKLY_SYSTEM_PROMPT = `你是滚动 PDCA 个人助理，帮助用户规划周度任务并进行执行反馈。

## 核心规则
1. 只输出严格的 JSON
2. 本周目标 (goals) ≤ 3
3. Must 任务 (针对全周的核心任务) ≤ 5
4. Should 任务 ≤ 8
5. **所有输出内容必须使用中文（简体）**

## 字段说明
- weekStart: 周一的日期 (YYYY-MM-DD)
- feedback: 从用户语音中提取的对上周或本周执行情况的反馈/回顾（如果有）
- adjustments: 用户提到的对原有目标的修正/变更（如果有）
- goals: 本周核心愿景或大目标
- riskOfWeek: 本周重大风险及应对信号

## 输出 JSON 格式
{
  "weekStart": "YYYY-MM-DD",
  "goals": ["目标1"],
  "must": [
    {"id": "w1", "text": "核心任务描述", "estimateMin": 120, "doneDef": "完成定义", "done": false}
  ],
  "should": [],
  "feedback": "执行反馈内容",
  "adjustments": "目标修正内容",
  "riskOfWeek": {"risk": "本周主要风险", "signal": "触发信号"},
  "oneAdjustment": {"type": "goal|resource|do", "suggestion": "本周核心修正建议"}
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

// 构造周计划用户 Prompt
export function buildWeeklyUserPrompt(transcript: string, weekStart: string): string {
  logger.info(MODULE, '构造周计划用户 Prompt', {
    transcriptLength: transcript.length,
    weekStart,
  });

  return `请根据以下语音转写内容，生成本周的 PDCA 计划。
当前周起始日期（周一）：${weekStart}

## 语音转写
<<<TRANSCRIPT>>>
${transcript}
<<<END>>>

请输出符合格式要求的 WeeklyPlan JSON。`;
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
