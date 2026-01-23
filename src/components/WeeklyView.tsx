'use client';

import { useState } from 'react';
import type { Task, WeeklyPlan } from '@/types/plan';
import logger from '@/lib/logger';
import './WeeklyView.css';

const MODULE = 'WeeklyView';

interface TaskItemProps {
    task: Task;
    type: 'must' | 'should';
    onToggle: (taskId: string, done: boolean) => void;
}

function TaskItem({ task, type, onToggle }: TaskItemProps) {
    const [expanded, setExpanded] = useState(false);

    const handleToggle = () => {
        onToggle(task.id, !task.done);
    };

    return (
        <div className={`task-item ${task.done ? 'task-done' : ''}`} data-type={type}>
            <div className="task-header" onClick={() => setExpanded(!expanded)}>
                <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={task.done}
                        onChange={handleToggle}
                    />
                    <span className="checkmark"></span>
                </label>

                <div className="task-content">
                    <span className="task-text">{task.text}</span>
                    <div className="task-meta">
                        <span className={`task-type task-type-${type}`}>
                            {type === 'must' ? 'Core' : 'Side'}
                        </span>
                        <span className="task-time">⏱️ {task.estimateMin}m</span>
                    </div>
                </div>
                <span className={`task-expand ${expanded ? 'expanded' : ''}`}>▼</span>
            </div>

            {expanded && (
                <div className="task-details">
                    <div className="task-detail-row">
                        <span className="detail-label">Done Definition:</span>
                        <span className="detail-value">{task.doneDef}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

interface WeeklyViewProps {
    plan: WeeklyPlan;
    onPlanUpdate: (plan: WeeklyPlan) => void;
}

export default function WeeklyView({ plan, onPlanUpdate }: WeeklyViewProps) {
    const handleTaskToggle = (taskId: string, done: boolean) => {
        const newPlan = { ...plan };

        const updateTasks = (tasks: Task[]) => {
            return tasks.map(t => t.id === taskId ? { ...t, done } : t);
        };

        newPlan.must = updateTasks(newPlan.must);
        newPlan.should = updateTasks(newPlan.should);

        onPlanUpdate(newPlan);
    };

    const must = plan.must || [];
    const should = plan.should || [];
    const mustDone = must.filter(t => t.done).length;
    const shouldDone = should.filter(t => t.done).length;

    return (
        <div className="weekly-view-container">
            {/* 核心目标 */}
            <section className="weekly-section goals-section">
                <h2 className="section-title">
                    <svg className="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    本周核心目标
                </h2>
                <ul className="weekly-goals-list">
                    {plan.goals.map((goal, i) => (
                        <li key={i}>{goal}</li>
                    ))}
                </ul>
            </section>

            {/* 执行反馈与修正 */}
            {(plan.feedback || plan.adjustments) && (
                <section className="weekly-section reflection-section">
                    <h2 className="section-title">
                        <svg className="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        执行实录与修正
                    </h2>
                    <div className="reflection-cards">
                        {plan.feedback && (
                            <div className="reflection-card feedback-card">
                                <h3>执行反馈</h3>
                                <p>{plan.feedback}</p>
                            </div>
                        )}
                        {plan.adjustments && (
                            <div className="reflection-card adjustments-card">
                                <h3>计划修正</h3>
                                <p>{plan.adjustments}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 任务清单 */}
            <div className="weekly-tasks-grid">
                <section className="task-section">
                    <div className="section-header">
                        <h2 className="section-title">Must Do</h2>
                        <span className="section-progress">{mustDone}/{must.length}</span>
                    </div>
                    <div className="task-list">
                        {must.map(task => (
                            <TaskItem key={task.id} task={task} type="must" onToggle={handleTaskToggle} />
                        ))}
                    </div>
                </section>

                <section className="task-section">
                    <div className="section-header">
                        <h2 className="section-title">Should Do</h2>
                        <span className="section-progress">{shouldDone}/{should.length}</span>
                    </div>
                    <div className="task-list">
                        {should.map(task => (
                            <TaskItem key={task.id} task={task} type="should" onToggle={handleTaskToggle} />
                        ))}
                    </div>
                </section>
            </div>

            {/* 风险与修正建议 */}
            <section className="info-section">
                <div className="info-card risk-card">
                    <h3 className="info-title">本周风险</h3>
                    <p className="info-text">{plan.riskOfWeek.risk}</p>
                    <p className="info-signal">信号：{plan.riskOfWeek.signal}</p>
                </div>
                <div className="info-card adjustment-card">
                    <h3 className="info-title">核心修正 [{plan.oneAdjustment.type}]</h3>
                    <p className="info-text">{plan.oneAdjustment.suggestion}</p>
                </div>
            </section>
        </div>
    );
}
