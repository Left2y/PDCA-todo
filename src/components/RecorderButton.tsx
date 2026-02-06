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
        <div className="te-recorder-module">
            {state.error && (
                <div className="te-error-toast">
                    <span>ERR: {state.error}</span>
                </div>
            )}

            {!state.isRecording ? (
                <div className="te-knob-area">
                    <button
                        className="te-knob-btn-core tactile-btn"
                        onClick={handleStart}
                        disabled={disabled}
                    >
                        {/* 交互层 */}
                    </button>
                </div>
            ) : (
                <div className="recording-state-container">
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
