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
        <div className={`task-item ${task.done ? 'task-done' : ''}`}>
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
                        <span className="section-icon">🎯</span>
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
                        <span className="section-icon">📋</span>
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
                        <span className="info-icon">⚠️</span>
                        今日风险
                    </h3>
                    <p className="info-text">{plan.riskOfDay.risk}</p>
                    <p className="info-signal">
                        <strong>触发信号：</strong>{plan.riskOfDay.signal}
                    </p>
                </div>

                <div className="info-card adjustment-card">
                    <h3 className="info-title">
                        <span className="info-icon">💡</span>
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
                    <h3 className="assumptions-title">📌 假设条件</h3>
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
