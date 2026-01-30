'use client';

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RecorderButton from '@/components/RecorderButton';
import { IssueCard } from '@/components/IssueCard';
import { LCDDisplay } from '@/components/LCDDisplay';
import TranscriptModal from '@/components/TranscriptModal';
import type { DailyPlan, IssueCard as IssueCardType, ProcessingState, AppSettings } from '@/types/plan';
import { DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Today.css';

const MODULE = 'TodayPage';

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
                const response = await apiClient.getLogs(today);

                const cloudCards = Array.isArray(response.dailyPlan)
                    ? (response.dailyPlan as IssueCardType[])
                    : response.dailyPlan
                        ? [response.dailyPlan as unknown as IssueCardType]
                        : null;

                setCards(cloudCards ?? []);
            } catch (error) {
                setCards([]);
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

    const handleCardDelete = useCallback(async (cardId: string) => {
        logger.info(MODULE, 'Terminating sequence', { cardId });

        // 1. Instant UI update using functional update to ensure latest state
        setCards(prevCards => {
            const newCards = prevCards.filter(c => c.id !== cardId);

            apiClient.saveLogs({
                date: getToday(),
                transcript: 'Sequence Terminated',
                dailyPlan: newCards as any
            }, { keepalive: true }).then(() => {
                logger.info(MODULE, 'Cloud sync complete');
                apiClient.getLogs(getToday()).then((response) => {
                    if (Array.isArray(response.dailyPlan)) {
                        setCards(response.dailyPlan as IssueCardType[]);
                    }
                }).catch(e => {
                    logger.warn(MODULE, 'Refresh after delete failed', e);
                });
            }).catch(e => {
                logger.error(MODULE, 'Card termination sync failed', e);
            });

            return newCards;
        });
    }, []);

    return (
        <div className="today-page">
            {/* Independent Sticky Navigation + LCD */}
            <div className="sticky-nav-container">
                <div className="te-nav-hardware">
                    <Link href="/today" className="te-nav-btn active">TODAY</Link>
                    <Link href="/weekly" className="te-nav-btn">WEEK</Link>
                    <Link href="/history" className="te-nav-btn">LOGS</Link>
                    <Link href="/settings" className="te-nav-btn">SETUP</Link>
                </div>

                <div className="te-lcd-section">
                    <LCDDisplay
                        value={dateInfo.dateStr}
                        subValue={dateInfo.dayName}
                        active={true}
                    />
                </div>
            </div>

            <header className="page-header">
                <div className="te-header-wrapper">


                    <div className="te-brand-row">
                        <div className="te-brand-col">
                            <h1 className="te-brand-title">TODAY LIST</h1>
                        </div>
                        <div className="te-brand-info">
                            <div className="te-sync-hardware">
                                <span className="te-sync-label">SYNC</span>
                                <div className="te-sync-diagram">
                                    <div className="node-top"></div>
                                    <div className="conn-vertical"></div>
                                    <div className="node-row">
                                        <div className="node"></div>
                                        <div className="node"></div>
                                        <div className="node"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 事项卡列表 */}
            <div className="cards-container">
                <div className="te-side-labels-left">
                    <div className="side-label-item">
                        <span className="side-label-text">CHANNEL A</span>
                        <div className="side-label-arrow-down"></div>
                    </div>
                    <div className="side-label-item">
                        <span className="side-label-text">INPUT</span>
                    </div>
                    <div className="side-label-item">
                        <span className="side-label-text">OUTPUT</span>
                    </div>
                </div>
                <div className="te-side-labels-right">
                    <div className="side-label-item">
                        <span className="side-label-text">CHANNEL A</span>
                    </div>
                    <div className="side-label-item">
                        <span className="side-label-text">CHANNEL B</span>
                    </div>
                </div>

                {cards.map((card, index) => (
                    <div key={card.id}>
                        <IssueCard
                            card={card}
                            onTaskToggle={handleTaskToggle}
                            onDelete={handleCardDelete}
                        />
                    </div>
                ))}
            </div>

            {/* 处理状态浮窗 */}
            {processing.step !== 'idle' && (
                <div className={`status-toast ${processing.step}`}>
                    <span className="blink-dot">●</span> {processing.message.toUpperCase()}
                </div>
            )}

            <TranscriptModal
                open={Boolean(transcript)}
                transcript={transcript}
                editableTranscript={editableTranscript}
                isEditing={isEditingTranscript}
                onToggleEdit={() => setIsEditingTranscript(!isEditingTranscript)}
                onChange={setEditableTranscript}
                onCancel={() => {
                    setTranscript('');
                    setEditableTranscript('');
                    setIsEditingTranscript(false);
                }}
                onConfirm={handleGenerate}
            />

            {!transcript && (
                <div className="te-recorder-area">
                    <div className="te-recorder-stack">
                        <div className="te-recorder-markers">
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                            <div key={deg} className="te-marker-dot" style={{ transform: `rotate(${deg}deg) translate(58px)` }}></div>
                        ))}
                        <span className="te-marker-label label-hold">HOLD</span>
                        <span className="te-marker-label label-record">RECORD</span>
                        <span className="te-marker-label label-filter">FILTER</span>
                        </div>
                        <RecorderButton
                            onRecordingComplete={handleRecordingComplete}
                            disabled={processing.step === 'transcribing' || processing.step === 'generating'}
                        />
                    </div>
                </div>
            )}

            {/* Bottom Hardware Markings */}
            <footer className="te-hardware-footer">
                <div className="te-brand-stamp">
                    <span>#E0E0E0</span>
                    <strong>PLASTIC</strong>
                </div>

                <div className="te-power-hardware">
                    <span className="te-power-label">POWER</span>
                    <div className="te-power-switch">
                        <div className="switch-led"></div>
                        <div className="switch-slider"></div>
                    </div>
                </div>

                <div className="te-audio-labels">
                    <div className="label-item">
                        <span>AUDIO OUT</span>
                        <div className="te-arrow-down-hardware"></div>
                    </div>
                    <div className="label-item">
                        <span>HEADPHONE</span>
                        <div className="te-icon-headphone-hardware">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </footer>
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
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const dayName = days[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');

    return { dayName, dateStr: `${month}/${day}` };
}
