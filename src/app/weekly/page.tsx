'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RecorderButton } from '@/components/RecorderButton';
import WeeklyView from '@/components/WeeklyView';
import { LCDDisplay } from '@/components/LCDDisplay';
import type { WeeklyPlan, ProcessingState, AppSettings } from '@/types/plan';
import { DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Weekly.css';
import '@/app/today/Today.css'; // Reuse Today styles

const MODULE = 'WeeklyPage';

function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}

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

export default function WeeklyPage() {
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [transcript, setTranscript] = useState('');
    const [editableTranscript, setEditableTranscript] = useState('');
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [processing, setProcessing] = useState<ProcessingState>({
        step: 'idle',
        message: '',
    });

    const [weekStart, setWeekStart] = useState<string>('');
    const [dateInfo, setDateInfo] = useState({ dayName: '', dateStr: '' });

    useEffect(() => {
        const ws = getWeekStart();
        setWeekStart(ws);
        setDateInfo(getFormattedDate()); // For LCD

        const loadData = async () => {
            const settings = getSettings();
            if (settings.apiKey) {
                bailianClient.updateSettings(settings);
            }

            try {
                const existingPlan = await apiClient.getWeeklyPlan(ws);
                if (existingPlan) {
                    setPlan(existingPlan);
                }
            } catch (error) {
                logger.warn(MODULE, '加载周计划失败', { error });
            }
        };
        loadData();
    }, []);

    const handleRecordingComplete = useCallback(async (blob: Blob) => {
        setTranscript('');
        setEditableTranscript('');

        const settings = bailianClient.getSettings();
        if (!settings?.apiKey) {
            setProcessing({ step: 'error', message: '请先配置 API Key', error: 'API Key 未设置' });
            return;
        }

        setProcessing({ step: 'transcribing', message: '正在转写语音...' });
        const result = await bailianClient.transcribe(blob);

        if (!result.success || !result.transcript) {
            setProcessing({ step: 'error', message: '语音转写失败', error: result.error });
            return;
        }

        setTranscript(result.transcript);
        setEditableTranscript(result.transcript);
        setProcessing({ step: 'idle', message: '' });
    }, []);

    const handleGenerate = useCallback(async () => {
        const textToUse = isEditingTranscript ? editableTranscript : transcript;
        if (!textToUse.trim()) return;

        setProcessing({ step: 'generating', message: '正在生成周计划...' });
        const result = await bailianClient.generateWeeklyPlan(textToUse, weekStart);

        if (!result.success || !result.plan) {
            setProcessing({
                step: 'error',
                message: '生成周计划失败',
                error: result.validationErrors?.join('\n') || result.error,
            });
            return;
        }

        try {
            await apiClient.saveWeeklyLogs({
                weekStart,
                transcript: textToUse,
                weeklyPlan: result.plan,
            });
        } catch (error) {
            logger.warn(MODULE, '保存周计划失败', { error });
        }

        setPlan(result.plan);
        setProcessing({ step: 'done', message: '周计划生成完成！' });
        setTimeout(() => setProcessing({ step: 'idle', message: '' }), 1500);
    }, [transcript, editableTranscript, isEditingTranscript, weekStart]);

    return (
        <div className="today-page">
            {/* Independent Sticky Navigation + LCD */}
            <div className="sticky-nav-container">
                <div className="te-nav-hardware">
                    <Link href="/today" className="te-nav-btn">日计划 [TODAY]</Link>
                    <Link href="/weekly" className="te-nav-btn active">周计划 [WEEK]</Link>
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
                            <h1 className="te-brand-title">WEEKLY PLAN</h1>
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
                        <span className="side-label-text">WEEK</span>
                        <div className="side-label-arrow-down"></div>
                    </div>
                    <div className="side-label-item">
                        <span className="side-label-text">INPUT</span>
                    </div>
                </div>
                <div className="te-side-labels-right">
                    <div className="side-label-item">
                        <span className="side-label-text">GOALS</span>
                    </div>
                    <div className="side-label-item">
                        <span className="side-label-text">OUTPUT</span>
                    </div>
                </div>

                {processing.step !== 'idle' && (
                    <div className={`status-toast ${processing.step}`}>
                        <span className="blink-dot">●</span> {processing.message.toUpperCase()}
                    </div>
                )}

                {transcript && !plan && (
                    <div className="transcript-section" style={{ marginTop: '20px', padding: '10px', background: '#e0e0e0', border: '1px solid #ccc', borderRadius: '8px' }}>
                        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h2 className="section-title" style={{ fontSize: '12px', fontWeight: 'bold' }}>TRANSCRIPT DATA</h2>
                            <button onClick={() => setIsEditingTranscript(!isEditingTranscript)} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                {isEditingTranscript ? '[ SAVE ]' : '[ EDIT ]'}
                            </button>
                        </div>
                        {isEditingTranscript ? (
                            <textarea
                                className="transcript-editor"
                                value={editableTranscript}
                                onChange={(e) => setEditableTranscript(e.target.value)}
                                rows={5}
                                style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                        ) : (
                            <p className="transcript-text" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{transcript}</p>
                        )}
                        <div className="transcript-actions" style={{ marginTop: '10px' }}>
                            <button className="btn-confirm" onClick={handleGenerate} style={{ width: '100%', padding: '8px', background: '#ff6b00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>EXECUTE PLAN</button>
                        </div>
                    </div>
                )}

                {plan && (
                    <div className="weekly-content">
                        <WeeklyView plan={plan} onPlanUpdate={setPlan} />
                        <div className="plan-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setPlan(null)} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', fontWeight: 'bold', color: '#666' }}>RESET</button>
                        </div>
                    </div>
                )}
            </div>

            {!plan && !transcript && (
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
