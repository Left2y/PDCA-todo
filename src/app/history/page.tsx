'use client';

import { useState, useEffect } from 'react';
import type { DailyPlan } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import logger from '@/lib/logger';
import './History.css';

const MODULE = 'HistoryPage';

export default function HistoryPage() {
    const [plans, setPlans] = useState<DailyPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<DailyPlan | null>(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        const mustDone = plan.must.filter(t => t.done).length;
        const shouldDone = plan.should.filter(t => t.done).length;
        return {
            must: `${mustDone}/${plan.must.length}`,
            should: `${shouldDone}/${plan.should.length}`,
            total: mustDone + shouldDone,
            totalTasks: plan.must.length + plan.should.length,
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

    if (loading) {
        return (
            <div className="history-page">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    return (
        <div className="history-page">
            <header className="page-header">
                <h1 className="page-title">历史记录</h1>
                <div className="header-actions">
                    <button className="btn-export" onClick={handleExportJson}>
                        📦 导出 JSON
                    </button>
                </div>
            </header>

            {plans.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <p>暂无历史记录</p>
                    <p className="empty-hint">开始录音并生成计划后，这里会显示历史记录</p>
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
                            >
                                <div className="item-header">
                                    <span className="item-date">{formatDate(plan.date)}</span>
                                    <span className="item-date-full">{plan.date}</span>
                                </div>

                                <div className="item-stats">
                                    <span className="stat must">Must: {stats.must}</span>
                                    <span className="stat should">Should: {stats.should}</span>
                                    <span className="stat-progress">
                                        {Math.round((stats.total / stats.totalTasks) * 100) || 0}%
                                    </span>
                                </div>

                                <div className="item-preview">
                                    {plan.must.slice(0, 2).map(task => (
                                        <span key={task.id} className={`preview-task ${task.done ? 'done' : ''}`}>
                                            {task.done ? '✅' : '⬜'} {task.text.slice(0, 20)}...
                                        </span>
                                    ))}
                                </div>

                                {/* 展开详情 */}
                                {selectedPlan?.date === plan.date && (
                                    <div className="item-detail" onClick={(e) => e.stopPropagation()}>
                                        <div className="detail-section">
                                            <h3>Must 任务</h3>
                                            <ul>
                                                {plan.must.map(task => (
                                                    <li key={task.id} className={task.done ? 'done' : ''}>
                                                        {task.done ? '✅' : '⬜'} {task.text}
                                                        <span className="task-time">（{task.estimateMin}分钟）</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {plan.should.length > 0 && (
                                            <div className="detail-section">
                                                <h3>Should 任务</h3>
                                                <ul>
                                                    {plan.should.map(task => (
                                                        <li key={task.id} className={task.done ? 'done' : ''}>
                                                            {task.done ? '✅' : '⬜'} {task.text}
                                                            <span className="task-time">（{task.estimateMin}分钟）</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="detail-section">
                                            <h3>风险 & 修正</h3>
                                            <p><strong>风险：</strong>{plan.riskOfDay.risk}</p>
                                            <p><strong>信号：</strong>{plan.riskOfDay.signal}</p>
                                            <p><strong>修正：</strong>[{plan.oneAdjustment.type}] {plan.oneAdjustment.suggestion}</p>
                                        </div>

                                        <div className="detail-actions">
                                            <button
                                                className="btn-sm btn-secondary"
                                                onClick={() => setShowRawJson(!showRawJson)}
                                            >
                                                {showRawJson ? '隐藏' : '查看'} JSON
                                            </button>
                                        </div>

                                        {showRawJson && (
                                            <pre className="raw-json">{JSON.stringify(plan, null, 2)}</pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
