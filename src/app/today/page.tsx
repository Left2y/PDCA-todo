'use client';

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RecorderButton from '@/components/RecorderButton';
import { IssueCard } from '@/components/IssueCard';
import { LCDDisplay } from '@/components/LCDDisplay';
import type { DailyPlan, IssueCard as IssueCardType, ProcessingState, AppSettings } from '@/types/plan';
import { DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Today.css';

const MODULE = 'TodayPage';

const EXAMPLE_CARDS: IssueCardType[] = [
    {
        id: 'example-1',
        title: '示例 A：官网首页视觉改版',
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
    },
    {
        id: 'example-2',
        title: '示例 B：双周会技术同步',
        createdAt: new Date().toISOString(),
        plan: {
            date: new Date().toISOString().split('T')[0],
            must: [
                { id: 'm1', text: '准备架构演进路线图 PPT', estimateMin: 120, doneDef: 'PPT 上传至网盘', done: true },
                { id: 'm2', text: '整理遗留需求清理列表', estimateMin: 40, doneDef: '完成清单导出', done: false }
            ],
            should: [
                { id: 's1', text: '收集各业务线目前的痛点', estimateMin: 60, doneDef: '记录至少 3 条有效痛点', done: false }
            ],
            riskOfDay: { risk: '会议时间可能被紧急修复任务占用', signal: '产服反馈有线上严重 Bug' },
            oneAdjustment: { type: 'do', suggestion: '若发生线上异常，会议顺延至下午 4 点' },
            assumptions: ['认为目前的服务端瓶颈在于数据库 IO']
        }
    },
    {
        id: 'example-3',
        title: '示例 C：智能硬件 PWA 性能压测',
        createdAt: new Date().toISOString(),
        plan: {
            date: new Date().toISOString().split('T')[0],
            must: [
                { id: 'm1', text: '执行 Lighthouse 移动端基准测试', estimateMin: 20, doneDef: '记录初次基准分数', done: false },
                { id: 'm2', text: '针对 Service Worker 缓存进行模拟断网测试', estimateMin: 40, doneDef: '离线模式下页面核心逻辑正常加载', done: false }
            ],
            should: [
                { id: 's1', text: '对比测试不同 Android 版本的 Webview 渲染性能', estimateMin: 90, doneDef: '形成渲染性能对照表', done: false }
            ],
            riskOfDay: { risk: '部分低端测试样机可能因过热触发限频', signal: '测试分数出现波动下落' },
            oneAdjustment: { type: 'do', suggestion: '保持环境通风，测试间隙安排样机冷却时间' },
            assumptions: ['认为资源缓存策略是影响首次加载的关键因素']
        }
    }
];

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

                // For demonstration purposes, if we only have 0 or 1 card, 
                // we'll force the 3 examples so the user can see the layout.
                const cloudCards = response.dailyPlan
                    ? (Array.isArray(response.dailyPlan) ? response.dailyPlan : [/* fallback to examples */])
                    : [];

                if (cloudCards.length <= 1) {
                    setCards(EXAMPLE_CARDS);
                } else {
                    setCards(cloudCards);
                }
            } catch (error) {
                setCards(EXAMPLE_CARDS);
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

            // 2. Async cloud sync for non-example cards
            if (!cardId.startsWith('example-')) {
                apiClient.saveLogs({
                    date: getToday(),
                    transcript: 'Sequence Terminated',
                    dailyPlan: newCards as any
                }).then(() => {
                    logger.info(MODULE, 'Cloud sync complete');
                }).catch(e => {
                    logger.error(MODULE, 'Card termination sync failed', e);
                });
            }

            return newCards;
        });
    }, []);

    return (
        <div className="today-page">
            {/* Independent Sticky Navigation + LCD */}
            <div className="sticky-nav-container">
                <div className="te-nav-hardware">
                    <Link href="/today" className="te-nav-btn active">日计划 [TODAY]</Link>
                    <Link href="/weekly" className="te-nav-btn">周计划 [WEEK]</Link>
                    <Link href="/history" className="te-nav-btn">历史 [LOGS]</Link>
                    <Link href="/settings" className="te-nav-btn">设置 [SETTING]</Link>
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
            <div className="cards-container" style={{ paddingBottom: '140px' }}>
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

            {transcript ? (
                <div className="floating-transcript">
                    <div className="transcript-box">
                        <div className="transcript-header">
                            <span>TRANSCRIPT DATA</span>
                            <button onClick={() => setIsEditingTranscript(!isEditingTranscript)}>
                                {isEditingTranscript ? '[ SAVE ]' : '[ EDIT ]'}
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
                            <button className="btn-cancel" onClick={() => setTranscript('')}>DROP</button>
                            <button className="btn-confirm" onClick={handleGenerate}>COMMIT</button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="te-recorder-markers" style={{ pointerEvents: 'none', position: 'absolute', bottom: '48px', right: '14px', width: '120px', height: '120px', zIndex: 5 }}>
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                            <div key={deg} className="te-marker-dot" style={{ position: 'absolute', top: '50%', left: '50%', width: '4px', height: '4px', background: '#ccc', borderRadius: '50%', margin: '-2px', transform: `rotate(${deg}deg) translate(58px)` }}></div>
                        ))}
                        <span className="te-marker-label label-hold" style={{ position: 'absolute', left: '-10px', bottom: '25px', fontSize: '7px', fontWeight: 900, color: '#999' }}>HOLD</span>
                        <span className="te-marker-label label-record" style={{ position: 'absolute', left: '-10px', top: '15px', fontSize: '7px', fontWeight: 900, color: '#999' }}>RECORD</span>
                        <span className="te-marker-label label-filter" style={{ position: 'absolute', right: '0', top: '5px', fontSize: '7px', fontWeight: 900, color: '#999' }}>FILTER</span>
                    </div>
                    <RecorderButton
                        onRecordingComplete={handleRecordingComplete}
                        disabled={processing.step === 'transcribing' || processing.step === 'generating'}
                    />
                </>
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
