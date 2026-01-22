'use client';

import { useState, useEffect, useCallback } from 'react';
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
                    <span className="error-icon">⚠️</span>
                    <span>{state.error}</span>
                </div>
            )}

            <div className="recorder-controls">
                {!state.isRecording ? (
                    <button
                        className="recorder-btn recorder-btn-start"
                        onClick={handleStart}
                        disabled={disabled}
                    >
                        <span className="btn-icon">🎙️</span>
                        <span>开始录音</span>
                    </button>
                ) : (
                    <>
                        <div className="recorder-status">
                            <div className="recording-indicator" />
                            <span className="recorder-duration">{formatDuration(state.duration)}</span>
                            <span className="recorder-limit">/ 05:00</span>
                        </div>

                        <div className="recorder-actions">
                            <button
                                className="recorder-btn recorder-btn-stop"
                                onClick={handleStop}
                            >
                                <span className="btn-icon">⏹️</span>
                                <span>完成</span>
                            </button>
                            <button
                                className="recorder-btn recorder-btn-cancel"
                                onClick={handleCancel}
                            >
                                <span className="btn-icon">✖️</span>
                                <span>取消</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            <p className="recorder-hint">
                {state.isRecording
                    ? '说出今天要做什么、限制条件和担心的事情...'
                    : '点击开始录音，最长 5 分钟'}
            </p>
        </div>
    );
}

export default RecorderButton;
