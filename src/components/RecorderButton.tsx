'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import recorder, { type RecorderState } from '@/lib/recorder';
import logger from '@/lib/logger';
import './RecorderButton.css'; // css

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
        <div className="te-recorder-module" style={{
            position: 'absolute',
            bottom: '48px',
            right: '14px', // (14px container offset + 10px internal button margin = 24px total) matches footer right: 24px
            width: '120px',
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: 'none'
        }}>
            {state.error && (
                <div className="te-error-toast">
                    <span>ERR: {state.error}</span>
                </div>
            )}

            {!state.isRecording ? (
                <div className="te-knob-area" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
                    <button
                        className="te-knob-btn-core tactile-btn"
                        onClick={handleStart}
                        disabled={disabled}
                        style={{
                            width: '94px', // Slightly smaller container
                            height: '94px',
                            background: "url('/assets/rec_knob_v3.png') no-repeat center center",
                            backgroundSize: '115% 115%', // Zoom in to push white ring out
                            border: 'none',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            mixBlendMode: 'multiply',
                            boxShadow: '0 6px 12px rgba(0,0,0,0.4), inset 0 0 10px rgba(0,0,0,0.1)'
                        }}
                    >
                        {/* 交互层 */}
                    </button>
                </div>
            ) : (
                <div className="recording-state-container" style={{ pointerEvents: 'auto' }}>
                    <div className="te-lcd-timer">
                        {formatDuration(state.duration)}
                        <span className="blink-dot">.</span>
                    </div>

                    <div className="te-actions">
                        <button className="te-rect-btn black tactile-btn" onClick={handleStop}>
                            STOP
                        </button>
                        <button className="te-rect-btn grey tactile-btn" onClick={handleCancel}>
                            CLR
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecorderButton;
