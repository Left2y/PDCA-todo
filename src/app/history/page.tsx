'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LCDDisplay } from '@/components/LCDDisplay';
import type { DailyPlan } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import logger from '@/lib/logger';
import './History.css';
import '@/app/today/Today.css'; // Reuse Today styles

const MODULE = 'HistoryPage';

function getFormattedDate(d: Date = new Date()) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = days[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return { dayName, dateStr: `${month}/${day}` };
}

export default function HistoryPage() {
    const [plans, setPlans] = useState<DailyPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<DailyPlan | null>(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dateInfo, setDateInfo] = useState({ dayName: '', dateStr: '' });

    useEffect(() => {
        setDateInfo(getFormattedDate());

        const loadPlans = async () => {
            logger.info(MODULE, '加载历史计划');
            setLoading(true);

            try {
                // 获取最近30天的计划
                const dates: string[] = [];
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    dates.push(date.toISOString().split('T')[0]);
                }

                const plansData: DailyPlan[] = [];
                for (const date of dates) {
                    try {
                        const plan = await apiClient.getDailyPlan(date);
                        if (plan) {
                            plansData.push(plan);
                        }
                    } catch {
                        // 计划不存在，跳过
                    }
                }

                logger.info(MODULE, '历史计划加载完成', { count: plansData.length });
                setPlans(plansData);
            } catch (error) {
                logger.error(MODULE, '加载历史计划失败', { error });
            } finally {
                setLoading(false);
            }
        };

        loadPlans();
    }, []);

    const handleExportJson = async () => {
        logger.info(MODULE, '导出 JSON');
        try {
            const data = await apiClient.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pdca-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            logger.error(MODULE, '导出失败', { error });
            alert('导出失败，请查看控制台');
        }
    };

    const getCompletionStats = (plan: DailyPlan) => {
        const must = plan.must || [];
        const should = plan.should || [];
        const mustDone = must.filter(t => t.done).length;
        const shouldDone = should.filter(t => t.done).length;
        return {
            must: `${mustDone}/${must.length}`,
            should: `${shouldDone}/${should.length}`,
            total: mustDone + shouldDone,
            totalTasks: must.length + should.length,
        };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) {
            return '今天';
        }
        if (dateStr === yesterday.toISOString().split('T')[0]) {
            return '昨天';
        }
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
        });
    };

    return (
        <div className="today-page">
            <header className="page-header">
                <div className="te-header-wrapper">
                    <div className="te-nav-hardware">
                        <Link href="/today" className="te-nav-btn">日计划 [TODAY]</Link>
                        <Link href="/weekly" className="te-nav-btn">周计划 [WEEK]</Link>
                        <Link href="/history" className="te-nav-btn active">历史 [LOGS]</Link>
                        <Link href="/settings" className="te-nav-btn">设置 [SETTING]</Link>
                    </div>

                    <div className="te-lcd-section">
                        <LCDDisplay
                            value={dateInfo.dateStr}
                            subValue={dateInfo.dayName}
                            active={true}
                        />
                    </div>

                    <div className="te-brand-row">
                        <div className="te-brand-col">
                            <h1 className="te-brand-title">HISTORY LOGS</h1>
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

            <div className="cards-container" style={{ paddingBottom: '140px' }}>
                <div className="te-side-labels-left">
                    <div className="side-label-item">
                        <span className="side-label-text">ARCHIVE</span>
                        <div className="side-label-arrow-down"></div>
                    </div>
                </div>
                <div className="te-side-labels-right">
                    <div className="side-label-item">
                        <span className="side-label-text">DATA</span>
                    </div>
                </div>

                <div className="header-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-export" onClick={handleExportJson} style={{ padding: '8px 16px', background: '#333', color: '#fff', border: '1px solid #666', borderRadius: '4px', display: 'flex', alignItems: 'center', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900 }}>
                        <svg className="btn-icon-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', marginRight: '6px' }}>
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        EXPORT JSON
                    </button>
                </div>

                {loading ? (
                    <div className="loading" style={{ textAlign: 'center', padding: '40px', color: '#888', fontFamily: 'monospace' }}>LOADING_DATA...</div>
                ) : plans.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', border: '1px dashed #ccc', borderRadius: '8px', color: '#999' }}>
                        <p style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>NO RECORDS FOUND</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {plans.map((plan) => {
                            const stats = getCompletionStats(plan);
                            return (
                                <div
                                    key={plan.date}
                                    className={`history-item ${selectedPlan?.date === plan.date ? 'selected' : ''}`}
                                    onClick={() => setSelectedPlan(selectedPlan?.date === plan.date ? null : plan)}
                                    style={{
                                        background: '#e8e8e8',
                                        border: '1px solid #c0c0c0',
                                        borderRadius: '6px',
                                        marginBottom: '12px',
                                        padding: '12px',
                                        boxShadow: '2px 2px 5px rgba(0,0,0,0.1), inset 1px 1px 0px #fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                                        <span className="item-date" style={{ fontFamily: 'var(--font-main)', fontWeight: 900, color: '#333' }}>{formatDate(plan.date)}</span>
                                        <span className="item-date-full" style={{ fontFamily: 'monospace', color: '#888' }}>{plan.date}</span>
                                    </div>

                                    <div className="item-stats" style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>
                                        <span className="stat must">MUST: {stats.must}</span>
                                        <span className="stat should">SHOULD: {stats.should}</span>
                                    </div>

                                    {/* 展开详情 */}
                                    {selectedPlan?.date === plan.date && (
                                        <div className="item-detail" onClick={(e) => e.stopPropagation()} style={{ marginTop: '12px', borderTop: '1px solid #ccc', paddingTop: '12px', fontSize: '12px' }}>
                                            <div className="detail-section" style={{ marginBottom: '10px' }}>
                                                <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>CH. A [MUST]</h3>
                                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                                    {plan.must.map(task => (
                                                        <li key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                            <span style={{ color: task.done ? '#ff6b00' : '#ccc' }}>●</span>
                                                            <span style={{ textDecoration: task.done ? 'line-through' : 'none', color: task.done ? '#888' : '#333' }}>{task.text}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <pre style={{ background: '#333', color: '#0f0', padding: '10px', borderRadius: '4px', fontSize: '10px', overflowX: 'auto', marginTop: '10px' }}>
                                                {JSON.stringify(plan, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

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
