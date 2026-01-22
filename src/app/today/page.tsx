'use client';

import { useState, useEffect, useCallback } from 'react';
import RecorderButton from '@/components/RecorderButton';
import TaskList from '@/components/TaskList';
import type { DailyPlan, ProcessingState, AppSettings, DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Today.css';

const MODULE = 'TodayPage';

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

// 设置管理（暂时使用 localStorage）
function getSettings(): AppSettings {
    if (typeof window === 'undefined') {
        return {
            apiKey: '',
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            asrModel: 'paraformer-realtime-v2',
            llmModel: 'qwen-plus',
            saveAudio: false,
        };
    }
    const saved = localStorage.getItem('pdca-settings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            // ignore
        }
    }
    return {
        apiKey: '',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        asrModel: 'paraformer-realtime-v2',
        llmModel: 'qwen-plus',
        saveAudio: false,
    };
}

export default function TodayPage() {
    const [plan, setPlan] = useState<DailyPlan | null>(null);
    const [transcript, setTranscript] = useState('');
    const [editableTranscript, setEditableTranscript] = useState('');
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [processing, setProcessing] = useState<ProcessingState>({
        step: 'idle',
        message: '',
    });
    const [rawResponse, setRawResponse] = useState<string>('');
    const [showRaw, setShowRaw] = useState(false);

    // 加载今日计划和设置
    useEffect(() => {
        const loadData = async () => {
            logger.info(MODULE, '加载今日数据');

            // 加载设置
            const settings = getSettings();
            if (settings.apiKey) {
                bailianClient.updateSettings(settings);
                logger.info(MODULE, 'API 设置已加载');
            } else {
                logger.warn(MODULE, 'API Key 未设置');
            }

            // 从服务器加载今日计划
            try {
                const today = getToday();
                const existingPlan = await apiClient.getDailyPlan(today);
                if (existingPlan) {
                    logger.info(MODULE, '加载已有计划', { date: today });
                    setPlan(existingPlan);
                }
            } catch (error) {
                logger.warn(MODULE, '加载计划失败，可能是服务器不可用', { error });
            }
        };

        loadData();
    }, []);

    // 处理录音完成
    const handleRecordingComplete = useCallback(async (blob: Blob) => {
        logger.info(MODULE, '录音完成', { size: blob.size, type: blob.type });
        setTranscript('');
        setEditableTranscript('');
        setRawResponse('');

        // 检查设置
        const settings = bailianClient.getSettings();
        if (!settings?.apiKey) {
            setProcessing({
                step: 'error',
                message: '请先在设置页面配置 API Key',
                error: 'API Key 未设置',
            });
            return;
        }

        // 开始 ASR 转写
        setProcessing({ step: 'transcribing', message: '正在转写语音...' });

        const result = await bailianClient.transcribe(blob);

        if (!result.success || !result.transcript) {
            logger.error(MODULE, 'ASR 转写失败', { error: result.error });
            setProcessing({
                step: 'error',
                message: '语音转写失败',
                error: result.error,
            });
            return;
        }

        logger.info(MODULE, '转写成功', { length: result.transcript.length });
        setTranscript(result.transcript);
        setEditableTranscript(result.transcript);
        setProcessing({ step: 'idle', message: '' });
    }, []);

    // 生成计划
    const handleGenerate = useCallback(async () => {
        const textToUse = isEditingTranscript ? editableTranscript : transcript;

        if (!textToUse.trim()) {
            logger.warn(MODULE, '无转写文本');
            return;
        }

        logger.info(MODULE, '开始生成计划');
        setProcessing({ step: 'generating', message: '正在生成计划...' });

        const result = await bailianClient.generatePlan(textToUse);
        setRawResponse(result.rawResponse || '');

        if (!result.success || !result.plan) {
            logger.error(MODULE, '生成计划失败', {
                error: result.error,
                validationErrors: result.validationErrors,
            });
            setProcessing({
                step: 'error',
                message: '生成计划失败',
                error: result.validationErrors?.join('\n') || result.error,
            });
            return;
        }

        logger.info(MODULE, '计划生成成功', { date: result.plan.date });

        // 保存计划到服务器
        const planWithDate = { ...result.plan, date: getToday() };
        try {
            await apiClient.saveLogs({
                date: getToday(),
                transcript: textToUse,
                dailyPlan: planWithDate,
            });
            logger.info(MODULE, '计划已保存到服务器');
        } catch (error) {
            logger.warn(MODULE, '保存到服务器失败', { error });
        }

        setPlan(planWithDate);
        setProcessing({ step: 'done', message: '计划生成完成！' });

        // 清理状态
        setTimeout(() => {
            setProcessing({ step: 'idle', message: '' });
            setTranscript('');
            setEditableTranscript('');
        }, 1500);
    }, [transcript, editableTranscript, isEditingTranscript]);

    // 更新任务状态
    const handleTaskToggle = async (taskId: string, done: boolean) => {
        const today = getToday();
        await apiClient.updateTaskDone(today, taskId, done);
    };

    // 重新开始
    const handleReset = () => {
        logger.info(MODULE, '重新开始');
        setTranscript('');
        setEditableTranscript('');
        setRawResponse('');
        setProcessing({ step: 'idle', message: '' });
    };

    const renderProcessingStatus = () => {
        if (processing.step === 'idle') return null;

        return (
            <div className={`processing-status status-${processing.step}`}>
                {processing.step === 'transcribing' && (
                    <div className="status-content">
                        <span className="status-spinner">🔄</span>
                        <span>{processing.message}</span>
                    </div>
                )}
                {processing.step === 'generating' && (
                    <div className="status-content">
                        <span className="status-spinner">🤖</span>
                        <span>{processing.message}</span>
                    </div>
                )}
                {processing.step === 'done' && (
                    <div className="status-content">
                        <span className="status-icon">✅</span>
                        <span>{processing.message}</span>
                    </div>
                )}
                {processing.step === 'error' && (
                    <div className="status-content error">
                        <span className="status-icon">❌</span>
                        <div>
                            <div>{processing.message}</div>
                            {processing.error && (
                                <pre className="error-detail">{processing.error}</pre>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="today-page">
            <header className="page-header">
                <h1 className="page-title">今日计划</h1>
                <span className="page-date">{getToday()}</span>
            </header>

            {/* 录音区域 */}
            {!plan && (
                <RecorderButton
                    onRecordingComplete={handleRecordingComplete}
                    disabled={processing.step === 'transcribing' || processing.step === 'generating'}
                />
            )}

            {/* 处理状态 */}
            {renderProcessingStatus()}

            {/* 转写结果 */}
            {transcript && !plan && (
                <div className="transcript-section">
                    <div className="section-header">
                        <h2 className="section-title">语音转写</h2>
                        <button
                            className="btn-edit"
                            onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                        >
                            {isEditingTranscript ? '取消编辑' : '编辑'}
                        </button>
                    </div>

                    {isEditingTranscript ? (
                        <textarea
                            className="transcript-editor"
                            value={editableTranscript}
                            onChange={(e) => setEditableTranscript(e.target.value)}
                            rows={5}
                        />
                    ) : (
                        <p className="transcript-text">{transcript}</p>
                    )}

                    <div className="transcript-actions">
                        <button
                            className="btn-primary"
                            onClick={handleGenerate}
                            disabled={processing.step !== 'idle'}
                        >
                            生成计划
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={handleReset}
                        >
                            重新录音
                        </button>
                    </div>
                </div>
            )}

            {/* 任务列表 */}
            {plan && (
                <>
                    <TaskList
                        plan={plan}
                        onPlanUpdate={setPlan}
                        onTaskToggle={handleTaskToggle}
                    />

                    <div className="plan-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => setPlan(null)}
                        >
                            重新生成
                        </button>
                    </div>
                </>
            )}

            {/* 调试信息 */}
            {rawResponse && (
                <div className="debug-section">
                    <button
                        className="btn-debug"
                        onClick={() => setShowRaw(!showRaw)}
                    >
                        {showRaw ? '隐藏' : '显示'}原始响应 (调试)
                    </button>
                    {showRaw && (
                        <pre className="raw-response">{rawResponse}</pre>
                    )}
                </div>
            )}
        </div>
    );
}
