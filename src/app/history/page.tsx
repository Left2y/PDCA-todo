'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LCDDisplay } from '@/components/LCDDisplay';
import { IssueCard } from '@/components/IssueCard';
import type { IssueCard as IssueCardType } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import logger from '@/lib/logger';
import './History.css';
import '@/app/today/Today.css'; // Reuse Today styles

const MODULE = 'HistoryPage';

interface DayGroup {
    date: string;
    cards: IssueCardType[];
}

function getFormattedDate(d: Date = new Date()) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = days[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return { dayName, dateStr: `${month}/${day}` };
}

export default function HistoryPage() {
    const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [dateInfo, setDateInfo] = useState({ dayName: '', dateStr: '' });

    useEffect(() => {
        setMounted(true);
        setDateInfo(getFormattedDate());

        const loadHistory = async () => {
            logger.info(MODULE, '加载历史事项卡');
            setLoading(true);

            try {
                // 获取最近30天的数据
                const dates: string[] = [];
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    dates.push(date.toISOString().split('T')[0]);
                }

                const groups: DayGroup[] = [];
                for (const date of dates) {
                    try {
                        const response = await apiClient.getLogs(date);
                        // dailyPlan 现在是 IssueCard[] 格式
                        const cards = response.dailyPlan;
                        if (cards && Array.isArray(cards) && cards.length > 0) {
                            groups.push({ date, cards: cards as unknown as IssueCardType[] });
                        }
                    } catch {
                        // 日期无数据，跳过
                    }
                }

                logger.info(MODULE, '历史数据加载完成', { groupCount: groups.length });
                setDayGroups(groups);
            } catch (error) {
                logger.error(MODULE, '加载历史数据失败', { error });
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);

        // Only show relative dates after client hydration to prevent mismatch
        if (mounted) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (dateStr === today.toISOString().split('T')[0]) {
                return '今天';
            }
            if (dateStr === yesterday.toISOString().split('T')[0]) {
                return '昨天';
            }
        }

        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
        });
    };

    // 历史页面的任务状态切换为只读，不执行任何操作
    const handleTaskToggle = () => {
        // 历史记录为只读，不允许修改
    };

    return (
        <div className="today-page">
            {/* Independent Sticky Navigation + LCD */}
            <div className="sticky-nav-container">
                <div className="te-nav-hardware">
                    <Link href="/today" className="te-nav-btn">TODAY</Link>
                    <Link href="/weekly" className="te-nav-btn">WEEK</Link>
                    <Link href="/history" className="te-nav-btn active">LOGS</Link>
                    <Link href="/settings" className="te-nav-btn">SETUP</Link>
                </div>

                <div className="te-lcd-section">
                    <LCDDisplay
                        value={mounted ? dateInfo.dateStr : '--/--'}
                        subValue={mounted ? dateInfo.dayName : '---'}
                        active={true}
                    />
                </div>
            </div>

            <header className="page-header">
                <div className="te-header-wrapper">
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

            <div className="cards-container">
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
                ) : dayGroups.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', border: '1px dashed #ccc', borderRadius: '8px', color: '#999' }}>
                        <p style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>NO RECORDS FOUND</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {dayGroups.map((group) => (
                            <div key={group.date} className="history-day-group">
                                {/* 日期标题 */}
                                <div className="day-header" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    marginBottom: '12px',
                                    background: 'linear-gradient(to right, #e0e0e0, transparent)',
                                    borderLeft: '3px solid #ff6b00',
                                    fontFamily: 'var(--font-main)',
                                }}>
                                    <span style={{ fontWeight: 900, color: '#333', fontSize: '14px' }}>
                                        {formatDate(group.date)}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', color: '#888', fontSize: '11px' }}>
                                        {group.date} · {group.cards.length} ITEMS
                                    </span>
                                </div>

                                {/* 该日期下的所有卡片 */}
                                {group.cards.map((card) => (
                                    <IssueCard
                                        key={card.id}
                                        card={card}
                                        onTaskToggle={handleTaskToggle}
                                    />
                                ))}
                            </div>
                        ))}
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
