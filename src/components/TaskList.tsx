'use client';

import { useState } from 'react';
import type { Task, DailyPlan } from '@/types/plan';
import logger from '@/lib/logger';
import './TaskList.css';

const MODULE = 'TaskList';

interface TaskItemProps {
    task: Task;
    type: 'must' | 'should';
    date: string;
    onToggle: (taskId: string, done: boolean) => void;
}

function TaskItem({ task, type, onToggle }: TaskItemProps) {
    const [expanded, setExpanded] = useState(false);

    const handleToggle = async () => {
        const newDone = !task.done;
        logger.info(MODULE, '切换任务状态', { taskId: task.id, newDone });
        onToggle(task.id, newDone);
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
                            {type === 'must' ? 'Must' : 'Should'}
                        </span>
                        <span className="task-time">⏱️ {task.estimateMin}分钟</span>
                    </div>
                </div>

                <span className={`task-expand ${expanded ? 'expanded' : ''}`}>▼</span>
            </div>

            {expanded && (
                <div className="task-details">
                    <div className="task-detail-row">
                        <span className="detail-label">完成定义：</span>
                        <span className="detail-value">{task.doneDef}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

interface TaskListProps {
    plan: DailyPlan;
    onPlanUpdate: (plan: DailyPlan) => void;
    onTaskToggle?: (taskId: string, done: boolean) => Promise<void>;
}

export function TaskList({ plan, onPlanUpdate, onTaskToggle }: TaskListProps) {
    const handleTaskToggle = async (taskId: string, done: boolean) => {
        // 调用服务器 API 更新任务状态
        if (onTaskToggle) {
            try {
                await onTaskToggle(taskId, done);
            } catch (error) {
                logger.error(MODULE, '更新任务状态失败', { error });
                return;
            }
        }

        // 更新本地状态
        const newPlan = { ...plan };

        for (const task of newPlan.must) {
            if (task.id === taskId) {
                task.done = done;
                break;
            }
        }
        for (const task of newPlan.should) {
            if (task.id === taskId) {
                task.done = done;
                break;
            }
        }

        onPlanUpdate(newPlan);
    };

    const mustDone = plan.must.filter(t => t.done).length;
    const shouldDone = plan.should.filter(t => t.done).length;

    return (
        <div className="task-list-container">
            {/* Must 任务 */}
            <section className="task-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <svg className="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                        </svg>
                        Must
                    </h2>
                    <span className="section-progress">{mustDone}/{plan.must.length}</span>
                </div>

                {plan.must.length === 0 ? (
                    <p className="empty-hint">暂无 Must 任务</p>
                ) : (
                    <div className="task-list">
                        {plan.must.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                type="must"
                                date={plan.date}
                                onToggle={handleTaskToggle}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Should 任务 */}
            <section className="task-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <svg className="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        Should
                    </h2>
                    <span className="section-progress">{shouldDone}/{plan.should.length}</span>
                </div>

                {plan.should.length === 0 ? (
                    <p className="empty-hint">暂无 Should 任务</p>
                ) : (
                    <div className="task-list">
                        {plan.should.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                type="should"
                                date={plan.date}
                                onToggle={handleTaskToggle}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* 风险与修正 */}
            <section className="info-section">
                <div className="info-card risk-card">
                    <h3 className="info-title">
                        <svg className="info-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        今日风险
                    </h3>
                    <p className="info-text">{plan.riskOfDay.risk}</p>
                    <p className="info-signal">
                        <strong>触发信号：</strong>{plan.riskOfDay.signal}
                    </p>
                </div>

                <div className="info-card adjustment-card">
                    <h3 className="info-title">
                        <svg className="info-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.663 17h4.674" />
                            <path d="M10 20h4" />
                            <path d="M12 2v1" />
                            <path d="M4.929 4.929l.707.707" />
                            <path d="M19.071 4.929l-.707.707" />
                            <path d="M12 11v6" />
                            <path d="M12 7a4 4 0 0 1 4 4c0 1.556-.603 3.007-1.636 4.045A4 4 0 0 1 12 16.5a4 4 0 0 1-2.364-1.455A5.71 5.71 0 0 1 8 11a4 4 0 0 1 4-4z" />
                        </svg>
                        修正建议
                        <span className={`adjustment-type type-${plan.oneAdjustment.type}`}>
                            {plan.oneAdjustment.type}
                        </span>
                    </h3>
                    <p className="info-text">{plan.oneAdjustment.suggestion}</p>
                </div>
            </section>

            {/* 假设 */}
            {plan.assumptions.length > 0 && (
                <section className="assumptions-section">
                    <h3 className="assumptions-title">
                        <svg className="info-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                            <path d="M21 10V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2 2h-2V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H3a2 2 0 0 0-2 2v2h2a2 2 0 0 0 2 2v2H3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h2v-2a2 2 0 0 0 2-2h2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-2h-2a2 2 0 0 0-2-2V10h2a2 2 0 0 0 2-2z" />
                        </svg>
                        假设条件
                    </h3>
                    <ul className="assumptions-list">
                        {plan.assumptions.map((assumption, index) => (
                            <li key={index}>{assumption}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

export default TaskList;
