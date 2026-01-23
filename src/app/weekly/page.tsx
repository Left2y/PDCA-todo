'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecorderButton } from '@/components/RecorderButton';
import WeeklyView from '@/components/WeeklyView';
import type { WeeklyPlan, ProcessingState, AppSettings } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Weekly.css';

const MODULE = 'WeeklyPage';

function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}

function getSettings(): AppSettings {
    if (typeof window === 'undefined') {
        return {
            apiKey: '',
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            asrModel: 'qwen3-asr-flash',
            llmModel: 'qwen-plus',
            saveAudio: false,
        };
    }
    const saved = localStorage.getItem('pdca-settings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch { /* ignore */ }
    }
    return {
        apiKey: '',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        asrModel: 'paraformer-realtime-v2',
        llmModel: 'qwen-plus',
        saveAudio: false,
    };
}

export default function WeeklyPage() {
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [transcript, setTranscript] = useState('');
    const [editableTranscript, setEditableTranscript] = useState('');
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [processing, setProcessing] = useState<ProcessingState>({
        step: 'idle',
        message: '',
    });

    const weekStart = getWeekStart();

    useEffect(() => {
        const loadData = async () => {
            const settings = getSettings();
            if (settings.apiKey) {
                bailianClient.updateSettings(settings);
            }

            try {
                const existingPlan = await apiClient.getWeeklyPlan(weekStart);
                if (existingPlan) {
                    setPlan(existingPlan);
                }
            } catch (error) {
                logger.warn(MODULE, '加载周计划失败', { error });
            }
        };
        loadData();
    }, [weekStart]);

    const handleRecordingComplete = useCallback(async (blob: Blob) => {
        setTranscript('');
        setEditableTranscript('');

        const settings = bailianClient.getSettings();
        if (!settings?.apiKey) {
            setProcessing({ step: 'error', message: '请先配置 API Key', error: 'API Key 未设置' });
            return;
        }

        setProcessing({ step: 'transcribing', message: '正在转写语音...' });
        const result = await bailianClient.transcribe(blob);

        if (!result.success || !result.transcript) {
            setProcessing({ step: 'error', message: '语音转写失败', error: result.error });
            return;
        }

        setTranscript(result.transcript);
        setEditableTranscript(result.transcript);
        setProcessing({ step: 'idle', message: '' });
    }, []);

    const handleGenerate = useCallback(async () => {
        const textToUse = isEditingTranscript ? editableTranscript : transcript;
        if (!textToUse.trim()) return;

        setProcessing({ step: 'generating', message: '正在生成周计划...' });
        const result = await bailianClient.generateWeeklyPlan(textToUse, weekStart);

        if (!result.success || !result.plan) {
            setProcessing({
                step: 'error',
                message: '生成周计划失败',
                error: result.validationErrors?.join('\n') || result.error,
            });
            return;
        }

        try {
            await apiClient.saveWeeklyLogs({
                weekStart,
                transcript: textToUse,
                weeklyPlan: result.plan,
            });
        } catch (error) {
            logger.warn(MODULE, '保存周计划失败', { error });
        }

        setPlan(result.plan);
        setProcessing({ step: 'done', message: '周计划生成完成！' });
        setTimeout(() => setProcessing({ step: 'idle', message: '' }), 1500);
    }, [transcript, editableTranscript, isEditingTranscript, weekStart]);

    return (
        <div className="weekly-page">
            <header className="page-header modern-header">
                <div className="header-left">
                    <span className="day-name">This Week</span>
                    <div className="date-main">
                        <h1 className="page-title date-number">WEEKLY</h1>
                        <span className="month-name">PLAN</span>
                    </div>
                </div>
            </header>

            {!plan && (
                <RecorderButton
                    onRecordingComplete={handleRecordingComplete}
                    disabled={processing.step === 'transcribing' || processing.step === 'generating'}
                />
            )}

            {processing.step !== 'idle' && (
                <div className={`processing-status status-${processing.step}`}>
                    <div className="status-content">
                        <span>{processing.message}</span>
                        {processing.error && <pre className="error-detail">{processing.error}</pre>}
                    </div>
                </div>
            )}

            {transcript && !plan && (
                <div className="transcript-section">
                    <div className="section-header">
                        <h2 className="section-title">语音转写</h2>
                        <button onClick={() => setIsEditingTranscript(!isEditingTranscript)}>
                            {isEditingTranscript ? '取消' : '编辑'}
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
                        <button className="btn-primary" onClick={handleGenerate}>生成周计划</button>
                    </div>
                </div>
            )}

            {plan && (
                <div className="weekly-content">
                    <WeeklyView plan={plan} onPlanUpdate={setPlan} />
                    <div className="plan-actions" style={{ marginTop: '2rem' }}>
                        <button className="btn-secondary" onClick={() => setPlan(null)}>重新生成</button>
                    </div>
                </div>
            )}
        </div>
    );
}
