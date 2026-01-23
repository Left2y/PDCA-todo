'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import recorder, { type RecorderState } from '@/lib/recorder';
import logger from '@/lib/logger';
import './RecorderButton.css';

const MODULE = 'RecorderButton';

interface RecorderButtonProps {
    onRecordingComplete: (audioBlob: Blob) => void;
    disabled?: boolean;
}

export function RecorderButton({ onRecordingComplete, disabled }: RecorderButtonProps) {
    const [state, setState] = useState<RecorderState>({
        isRecording: false,
        duration: 0,
        error: null,
    });

    useEffect(() => {
        recorder.setStateChangeCallback(setState);
        return () => {
            recorder.setStateChangeCallback(() => { });
        };
    }, []);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = useCallback(async () => {
        logger.info(MODULE, '用户点击开始录音');
        try {
            await recorder.start();
        } catch (error) {
            logger.error(MODULE, '启动录音失败', { error });
        }
    }, []);

    const handleStop = useCallback(async () => {
        logger.info(MODULE, '用户点击停止录音');
        try {
            const audioBlob = await recorder.stop();
            logger.info(MODULE, '录音完成', { size: audioBlob.size });
            onRecordingComplete(audioBlob);
        } catch (error) {
            logger.error(MODULE, '停止录音失败', { error });
        }
    }, [onRecordingComplete]);

    const handleCancel = useCallback(() => {
        logger.info(MODULE, '用户取消录音');
        recorder.cancel();
    }, []);

    return (
        <div className="recorder-container">
            {state.error && (
                <div className="recorder-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.25rem', height: '1.25rem' }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>{state.error}</span>
                </div>
            )}

            <div className="recorder-controls">
                {!state.isRecording ? (
                    <div className="bottom-actions-row">
                        <button
                            className="recorder-btn-start"
                            onClick={handleStart}
                            disabled={disabled}
                        >
                            <svg className="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            <span>开始录制</span>
                        </button>

                        <Link href="/settings" className="btn-settings-icon" title="设置">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="recorder-status">
                            <span className="recorder-duration">{formatDuration(state.duration)}</span>
                            <span className="recorder-limit">/ 05:00</span>
                        </div>

                        <div className="recorder-actions">
                            <button
                                className="recorder-btn-circle recorder-btn-stop"
                                onClick={handleStop}
                                title="完成"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                            </button>
                            <button
                                className="recorder-btn-circle recorder-btn-cancel"
                                onClick={handleCancel}
                                title="取消"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default RecorderButton;
