'use client';

import React, { useState } from 'react';
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
    const isActive = doneTasks < allTasks.length && allTasks.length > 0;

    // Formatting ID for display (e.g. "SAMPLE 001")
    const displayId = card.id.slice(-3).toUpperCase().padStart(3, '0');

    const [isDeleteMode, setIsDeleteMode] = useState(false);

    return (
        <div className={`te-card-module ${isExpanded ? 'expanded' : ''} ${isDeleteMode ? 'delete-mode' : ''}`}>
            <div className="te-card-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="te-header-top">
                    <div className="te-header-left">
                        {/* Pad Indicator LED */}
                        <div className={`te-pad-led ${isActive && !isDeleteMode ? 'active' : ''} ${isDeleteMode ? 'warn' : ''}`}></div>
                        <span className="te-label-spec">SAMPLE {displayId}</span>
                    </div>

                    <div className="te-header-right">
                        {/* Delete icon - only shown in delete mode */}
                        {isDeleteMode && (
                            <button
                                type="button"
                                className="te-delete-icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onDelete?.(card.id);
                                    setIsDeleteMode(false);
                                }}
                                title="Confirm Delete"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        )}
                        <button
                            type="button"
                            className={`te-label-spec status-tag ${isDeleteMode ? 'delete' : 'active-tag'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                // Toggle delete mode
                                setIsDeleteMode(!isDeleteMode);
                            }}
                        >
                            {isDeleteMode ? 'DELETE' : (isActive ? 'ACTIVE' : 'IDLE')}
                        </button>
                    </div>



                </div>

                <div className="te-pad-content">
                    {/* The "Tactile Pad" Checkbox */}
                    <div className="te-main-pad-area">
                        <div className={`te-pad-button ${isExpanded ? 'active-expanded' : ''} ${doneTasks === allTasks.length ? 'done' : ''}`}>
                            <div className="pad-inner"></div>
                        </div>
                        <h3 className="te-card-title">{card.title || 'VOID SEQUENCE'}</h3>

                        {/* Decorative Linear Icon */}
                        <div className="te-card-icon-deco">
                            {card.title?.includes('设计') || card.title?.includes('改版') ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            ) : card.title?.includes('对接') || card.title?.includes('会议') ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`te-card-body-wrapper ${isExpanded ? 'active' : ''}`}>
                <div className="te-card-body">
                    {/* Channel A (MUST) */}
                    <HardwareSection
                        label="CH. A"
                        title="MUST"
                        tasks={card.plan.must || []}
                        cardId={card.id}
                        onToggle={onTaskToggle}
                    />

                    {/* Channel B (SHOULD) */}
                    <HardwareSection
                        label="CH. B"
                        title="SHOULD"
                        tasks={card.plan.should || []}
                        cardId={card.id}
                        onToggle={onTaskToggle}
                    />

                    {/* Technical Grid Overlay */}
                    <div className="te-tech-grid">
                        <div className="tech-cell">
                            <span className="cell-label">RISK</span>
                            <span className="cell-value">{card.plan.riskOfDay?.risk || '-'}</span>
                        </div>
                        <div className="tech-cell">
                            <span className="cell-label">ADJ</span>
                            <span className="cell-value">{card.plan.oneAdjustment?.suggestion || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HardwareSection({ label, title, tasks, cardId, onToggle }: any) {
    if (tasks.length === 0) return null;
    return (
        <div className="te-hw-section">
            <div className="te-section-header">
                <span className="te-section-label">{label}</span>
                <span className="te-section-title">[{title}]</span>
                <div className="te-connection-line"></div>
            </div>
            <div className="te-task-stack">
                {tasks.map((task: any) => (
                    <div key={task.id} className={`te-hw-task ${task.done ? 'done' : ''}`} onClick={() => onToggle(cardId, task.id, !task.done)}>
                        <div className="te-mini-led"></div>
                        <span className="te-hw-task-text">{task.text}</span>
                        <span className="te-hw-task-meta">{task.estimateMin}M</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
