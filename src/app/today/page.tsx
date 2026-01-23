'use client';

import { useState, useEffect, useCallback } from 'react';
import RecorderButton from '@/components/RecorderButton';
import { IssueCard } from '@/components/IssueCard';
import type { DailyPlan, IssueCard as IssueCardType, ProcessingState, AppSettings } from '@/types/plan';
import { DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Today.css';

const MODULE = 'TodayPage';

// 示例卡片数据
const EXAMPLE_CARD: IssueCardType = {
    id: 'example-1',
    title: '示例：官网首页视觉改版',
    createdAt: new Date().toISOString(),
    plan: {
        date: new Date().toISOString().split('T')[0],
        must: [
            { id: 'm1', text: '完成首屏 Banner 的高保真设计', estimateMin: 60, doneDef: '导出 Figma 链接并发送至群聊', done: false },
            { id: 'm2', text: '与前端对接新的响应式 Breakpoints', estimateMin: 30, doneDef: '确认所有断点样式无误', done: false }
        ],
        should: [
            { id: 's1', text: '优化深色模式下的对比度细节', estimateMin: 45, doneDef: '通过无障碍对比度测试', done: false }
        ],
        riskOfDay: { risk: '设计稿可能因字体缺失导致还原度下降', signal: '前端反馈本地渲染不一致' },
        oneAdjustment: { type: 'do', suggestion: '优先打包字体资源，确保开发环境一致' },
        assumptions: ['认为当前的蓝紫色调符合品牌升级方向']
    }
};

export default function TodayPage() {
    const [cards, setCards] = useState<IssueCardType[]>([]);
    const [transcript, setTranscript] = useState('');
    const [editableTranscript, setEditableTranscript] = useState('');
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [processing, setProcessing] = useState<ProcessingState>({
        step: 'idle',
        message: '',
    });

    const [dateInfo, setDateInfo] = useState({ dayName: '', dateStr: '' });

    // 加载数据
    useEffect(() => {
        // 设置日期（仅在客户端运行，防止水合错误）
        setDateInfo(getFormattedDate());

        const loadData = async () => {
            const settings = getSettings();
            if (settings.apiKey) bailianClient.updateSettings(settings);

            try {
                const today = getToday();
                // 修正为正确的 API 方法：getLogs
                const response = await apiClient.getLogs(today);
                if (response.dailyPlan && Array.isArray(response.dailyPlan)) {
                    setCards(response.dailyPlan);
                } else if (response.dailyPlan) {
                    // 兼容旧的单计划模式，转为单卡片
                    setCards([{
                        id: 'legacy-1',
                        title: '今日计划',
                        createdAt: today,
                        plan: response.dailyPlan as DailyPlan
                    }]);
                } else {
                    // 如果没有任何计划，显示示例卡片
                    setCards([EXAMPLE_CARD]);
                }
            } catch (error) {
                setCards([EXAMPLE_CARD]);
            }
        };
        loadData();
    }, []);

    const handleRecordingComplete = useCallback(async (blob: Blob) => {
        setProcessing({ step: 'transcribing', message: '正在转写语音...' });
        const result = await bailianClient.transcribe(blob);
        if (result.success && result.transcript) {
            setTranscript(result.transcript);
            setEditableTranscript(result.transcript);
            setProcessing({ step: 'idle', message: '' });
        } else {
            setProcessing({ step: 'error', message: '转写失败', error: result.error });
        }
    }, []);

    const handleGenerate = useCallback(async () => {
        const textToUse = isEditingTranscript ? editableTranscript : transcript;
        if (!textToUse.trim()) return;

        setProcessing({ step: 'generating', message: 'AI 正在拆解 PDCA...' });
        // 明确要求 DailyPlan
        const result = await bailianClient.generatePlan(textToUse);

        if (result.success && result.plan) {
            const plan = result.plan as DailyPlan;
            const newCard: IssueCardType = {
                id: `card-${Date.now()}`,
                title: plan.title || '新增事项',
                createdAt: new Date().toISOString(),
                plan: plan
            };

            const updatedCards = [newCard, ...cards];
            setCards(updatedCards);

            // 保存到服务器
            try {
                await apiClient.saveLogs({
                    date: getToday(),
                    transcript: textToUse,
                    dailyPlan: updatedCards as any // TODO: 明确接口类型
                });
            } catch (e) { logger.error(MODULE, '保存失败', e); }

            setProcessing({ step: 'done', message: '事项卡已生成！' });
            setTranscript('');
            setEditableTranscript('');
            setTimeout(() => setProcessing({ step: 'idle', message: '' }), 1500);
        } else {
            setProcessing({ step: 'error', message: '生成失败', error: result.error });
        }
    }, [transcript, editableTranscript, isEditingTranscript, cards]);

    const handleTaskToggle = async (cardId: string, taskId: string, done: boolean) => {
        const newCards = cards.map(card => {
            if (card.id !== cardId) return card;
            const updateTask = (t: any) => t.id === taskId ? { ...t, done } : t;
            return {
                ...card,
                plan: {
                    ...card.plan,
                    must: card.plan.must.map(updateTask),
                    should: card.plan.should.map(updateTask)
                }
            };
        });
        setCards(newCards);

        // 同步到服务器
        try {
            await apiClient.saveLogs({
                date: getToday(),
                transcript: 'Update task state',
                dailyPlan: newCards as any
            });
        } catch (e) { logger.error(MODULE, '状态同步失败', e); }
    };

    const handleCardDelete = async (cardId: string) => {
        logger.info(MODULE, '删除卡片', { cardId });
        const newCards = cards.filter(c => c.id !== cardId);
        setCards(newCards);

        // 同步到服务器
        try {
            await apiClient.saveLogs({
                date: getToday(),
                transcript: 'Delete card',
                dailyPlan: newCards as any
            });
            logger.info(MODULE, '卡片删除成功');
        } catch (e) {
            logger.error(MODULE, '卡片删除同步失败', e);
        }
    };

    return (
        <div className="today-page">
            <header className="page-header modern-header">
                <div className="header-top">
                    <div className="header-left">
                        <span className="day-name">{dateInfo.dayName}</span>
                        <div className="date-main">
                            <h1 className="page-title date-number">{dateInfo.dateStr}</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* 事项卡列表 */}
            <div className="cards-container" style={{ padding: '0 1.5rem 100px' }}>
                <h2 className="cards-count">今日事项 ({cards.length})</h2>
                {cards.map(card => (
                    <IssueCard
                        key={card.id}
                        card={card}
                        onTaskToggle={handleTaskToggle}
                        onDelete={handleCardDelete}
                    />
                ))}
            </div>

            {/* 处理状态浮窗 */}
            {processing.step !== 'idle' && (
                <div className={`status-toast ${processing.step}`}>
                    {processing.message}
                </div>
            )}

            {/* 录音及转写浮窗 */}
            {transcript ? (
                <div className="floating-transcript">
                    <div className="transcript-box">
                        <div className="transcript-header">
                            <span>{isEditingTranscript ? '编辑灵感' : '听到的内容'}</span>
                            <button onClick={() => setIsEditingTranscript(!isEditingTranscript)}>
                                {isEditingTranscript ? '完成' : '编辑'}
                            </button>
                        </div>
                        {isEditingTranscript ? (
                            <textarea
                                value={editableTranscript}
                                onChange={(e) => setEditableTranscript(e.target.value)}
                            />
                        ) : (
                            <p>{transcript}</p>
                        )}
                        <div className="transcript-btns">
                            <button className="btn-cancel" onClick={() => setTranscript('')}>取消</button>
                            <button className="btn-confirm" onClick={handleGenerate}>生成卡片</button>
                        </div>
                    </div>
                </div>
            ) : (
                <RecorderButton
                    onRecordingComplete={handleRecordingComplete}
                    disabled={processing.step === 'transcribing' || processing.step === 'generating'}
                />
            )}
        </div>
    );
}

// 辅助函数 (保持不变或微调)
function getToday(): string { return new Date().toISOString().split('T')[0]; }
function getSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const saved = localStorage.getItem('pdca-settings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch { /* ignore */ }
    }
    return DEFAULT_SETTINGS;
}
function getFormattedDate(d: Date = new Date()) {
    const dayName = d.toLocaleDateString('zh-CN', { weekday: 'long' });
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return { dayName, dateStr: `${month}/${day}` };
}
