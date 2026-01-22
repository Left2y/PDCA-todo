// 百炼 API 客户端 - ASR + LLM
'use client';

import logger from './logger';
import type { AppSettings, DailyPlan } from '@/types/plan';
import { SYSTEM_PROMPT, STRICT_SYSTEM_PROMPT, buildUserPrompt, buildRetryPrompt } from './prompt';
import { parseAndValidatePlan } from './validate';

const MODULE = 'BailianClient';

export interface TranscribeResult {
    success: boolean;
    transcript?: string;
    error?: string;
    rawResponse?: unknown;
}

export interface GeneratePlanResult {
    success: boolean;
    plan?: DailyPlan;
    rawResponse?: string;
    error?: string;
    validationErrors?: string[];
}

class BailianClient {
    private settings: AppSettings | null = null;

    // 更新设置
    updateSettings(settings: AppSettings): void {
        this.settings = settings;
        logger.info(MODULE, '设置已更新', {
            baseUrl: settings.baseUrl,
            asrModel: settings.asrModel,
            llmModel: settings.llmModel,
            hasApiKey: !!settings.apiKey,
        });
    }

    // 获取当前设置
    getSettings(): AppSettings | null {
        return this.settings;
    }

    // 检查设置是否有效
    private checkSettings(): void {
        if (!this.settings) {
            throw new Error('API 设置未配置');
        }
        if (!this.settings.apiKey) {
            throw new Error('API Key 未设置');
        }
        if (!this.settings.baseUrl) {
            throw new Error('Base URL 未设置');
        }
    }

    // ASR 转写
    async transcribe(audioBlob: Blob): Promise<TranscribeResult> {
        logger.info(MODULE, '开始 ASR 转写', {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
        });

        try {
            this.checkSettings();

            // 将音频转为 base64
            logger.debug(MODULE, '转换音频为 base64');
            const base64Audio = await this.blobToBase64(audioBlob);
            logger.debug(MODULE, 'base64 转换完成', { length: base64Audio.length });

            // 构造完整的 data URI
            const audioFormat = this.getAudioFormat(audioBlob.type);
            const dataUri = `data:audio/${audioFormat};base64,${base64Audio}`;

            const requestBody = {
                model: this.settings!.asrModel,
                messages: [
                    {
                        role: 'system',
                        content: [{ text: '' }],
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_audio',
                                input_audio: {
                                    data: dataUri,
                                },
                            },
                        ],
                    },
                ],
                stream: false,
                asr_options: {
                    enable_itn: true, // 启用逆文本正则化（数字、日期等规范化）
                },
            };

            logger.debug(MODULE, '发送 ASR 请求', {
                model: this.settings!.asrModel,
                audioFormat,
                dataUriLength: dataUri.length,
            });

            const response = await fetch(`${this.settings!.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings!.apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(MODULE, 'ASR 请求失败', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                });
                return {
                    success: false,
                    error: `ASR 请求失败: ${response.status} ${response.statusText}`,
                    rawResponse: errorText,
                };
            }

            const data = await response.json();
            logger.debug(MODULE, 'ASR 响应', { data });

            const transcript = data.choices?.[0]?.message?.content;
            if (!transcript) {
                logger.error(MODULE, 'ASR 响应中无转写结果', { data });
                return {
                    success: false,
                    error: 'ASR 响应中无转写结果',
                    rawResponse: data,
                };
            }

            logger.info(MODULE, 'ASR 转写成功', { transcriptLength: transcript.length });
            return {
                success: true,
                transcript,
                rawResponse: data,
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            logger.error(MODULE, 'ASR 转写异常', { error: errorMsg });
            return {
                success: false,
                error: errorMsg,
            };
        }
    }

    // LLM 生成计划
    async generatePlan(transcript: string, retry = false): Promise<GeneratePlanResult> {
        logger.info(MODULE, '开始生成计划', {
            transcriptLength: transcript.length,
            isRetry: retry,
        });

        try {
            this.checkSettings();

            const systemPrompt = retry ? STRICT_SYSTEM_PROMPT : SYSTEM_PROMPT;
            const userPrompt = buildUserPrompt(transcript);

            const requestBody = {
                model: this.settings!.llmModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3, // 降低随机性，提高结构化输出质量
            };

            logger.debug(MODULE, '发送 LLM 请求', { model: this.settings!.llmModel });

            const response = await fetch(`${this.settings!.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings!.apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(MODULE, 'LLM 请求失败', {
                    status: response.status,
                    error: errorText,
                });
                return {
                    success: false,
                    error: `LLM 请求失败: ${response.status}`,
                    rawResponse: errorText,
                };
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            logger.debug(MODULE, 'LLM 响应', { contentLength: content?.length });

            if (!content) {
                logger.error(MODULE, 'LLM 响应中无内容');
                return {
                    success: false,
                    error: 'LLM 响应中无内容',
                    rawResponse: JSON.stringify(data),
                };
            }

            // 验证响应
            const validation = parseAndValidatePlan(content);

            if (validation.success && validation.data) {
                logger.info(MODULE, '计划生成并验证成功', { date: validation.data.date });
                return {
                    success: true,
                    plan: validation.data,
                    rawResponse: content,
                };
            }

            // 验证失败，如果不是重试则尝试重试
            if (!retry) {
                logger.warn(MODULE, '验证失败，尝试重试', { errors: validation.errors });
                return this.retryGenerate(transcript, validation.errors || []);
            }

            // 重试也失败
            logger.error(MODULE, '重试后验证仍失败', { errors: validation.errors });
            return {
                success: false,
                error: '生成的计划格式不符合要求',
                validationErrors: validation.errors,
                rawResponse: content,
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            logger.error(MODULE, 'LLM 生成异常', { error: errorMsg });
            return {
                success: false,
                error: errorMsg,
            };
        }
    }

    // 重试生成
    private async retryGenerate(transcript: string, errors: string[]): Promise<GeneratePlanResult> {
        logger.info(MODULE, '执行重试生成');

        try {
            const retryPrompt = buildRetryPrompt(transcript, errors);

            const requestBody = {
                model: this.settings!.llmModel,
                messages: [
                    { role: 'system', content: STRICT_SYSTEM_PROMPT },
                    { role: 'user', content: retryPrompt },
                ],
                temperature: 0.1, // 重试时进一步降低随机性
            };

            const response = await fetch(`${this.settings!.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings!.apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(MODULE, '重试 LLM 请求失败', { status: response.status });
                return {
                    success: false,
                    error: `重试 LLM 请求失败: ${response.status}`,
                    rawResponse: errorText,
                };
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                return {
                    success: false,
                    error: '重试 LLM 响应中无内容',
                };
            }

            const validation = parseAndValidatePlan(content);

            if (validation.success && validation.data) {
                logger.info(MODULE, '重试生成并验证成功');
                return {
                    success: true,
                    plan: validation.data,
                    rawResponse: content,
                };
            }

            return {
                success: false,
                error: '重试后验证仍失败',
                validationErrors: validation.errors,
                rawResponse: content,
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '重试时发生错误';
            logger.error(MODULE, '重试生成异常', { error: errorMsg });
            return {
                success: false,
                error: errorMsg,
            };
        }
    }

    // Blob 转 base64
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // 移除 data URL 前缀
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // 获取音频格式
    private getAudioFormat(mimeType: string): string {
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mp4')) return 'mp4';
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('wav')) return 'wav';
        return 'webm'; // 默认
    }
}

// 单例导出
export const bailianClient = new BailianClient();
export default bailianClient;
