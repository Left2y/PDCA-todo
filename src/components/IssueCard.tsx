'use client';

import { useState } from 'react';
import type { IssueCard as IssueCardType, Task } from '@/types/plan';
import './IssueCard.css';

interface IssueCardProps {
    card: IssueCardType;
    onTaskToggle: (cardId: string, taskId: string, done: boolean) => void;
    onDelete?: (cardId: string) => void;
}

export function IssueCard({ card, onTaskToggle, onDelete }: IssueCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const allTasks = [...(card.plan.must || []), ...(card.plan.should || [])];
    const doneTasks = allTasks.filter(t => t.done).length;
    const progress = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;
    const isCompleted = allTasks.length > 0 && doneTasks === allTasks.length;

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('确定要删除这张事项卡吗？此操作不可撤销。')) {
            onDelete?.(card.id);
        }
    };

    return (
        <div className={`issue-card ${isExpanded ? 'expanded' : ''} ${isCompleted ? 'completed' : ''}`}>
            <div className="card-header" onClick={toggleExpand}>
                <div className="header-main">
                    <h3 className="card-title">{card.title || '未命名事项'}</h3>
                    <div className="card-meta">
                        <div className="meta-item">
                            <span className="card-time">{new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="meta-label">CREATED</span>
                        </div>
                        <div className="meta-item">
                            <div className="card-progress">
                                <span className="progress-text">{doneTasks}/{allTasks.length}</span>
                            </div>
                            <span className="meta-label">PROGRESS</span>
                        </div>
                    </div>
                </div>
                <div className={`card-toggle ${isExpanded ? 'expanded' : ''}`}>
                    <span className="toggle-inner"></span>
                </div>
            </div>

            {isExpanded && (
                <div className="card-content">
                    {/* Must Section */}
                    {(card.plan.must?.length || 0) > 0 && (
                        <div className="card-section">
                            <h4 className="section-label must">关键行动 (Must)</h4>
                            <div className="task-list">
                                {card.plan.must.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onToggle={(done) => onTaskToggle(card.id, task.id, done)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Should Section */}
                    {(card.plan.should?.length || 0) > 0 && (
                        <div className="card-section">
                            <h4 className="section-label should">建议行动 (Should)</h4>
                            <div className="task-list">
                                {card.plan.should.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onToggle={(done) => onTaskToggle(card.id, task.id, done)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Risk & Adjustment */}
                    <div className="card-info-grid">
                        <div className="info-item risk">
                            <h5>⚠️ 风险</h5>
                            <p>{card.plan.riskOfDay?.risk || '无'}</p>
                        </div>
                        <div className="info-item adjustment">
                            <h5>💡 建议</h5>
                            <p>{card.plan.oneAdjustment?.suggestion || '无'}</p>
                        </div>
                    </div>

                    {/* Delete Button */}
                    {onDelete && (
                        <div className="card-actions">
                            <button className="btn-delete" onClick={handleDelete}>
                                🗑️ 删除此卡片
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (done: boolean) => void }) {
    return (
        <label className={`task-row ${task.done ? 'done' : ''}`}>
            <input
                type="checkbox"
                checked={task.done}
                onChange={(e) => onToggle(e.target.checked)}
            />
            <div className="custom-checkbox">
                <div className="check-icon"></div>
            </div>
            <div className="task-info">
                <span className="task-text">{task.text}</span>
                <span className="task-estimate">⏱️ {task.estimateMin}min</span>
            </div>
        </label>
    );
}
