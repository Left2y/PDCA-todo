'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TranscriptModalProps {
    open: boolean;
    transcript: string;
    editableTranscript: string;
    isEditing: boolean;
    onToggleEdit: () => void;
    onChange: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export function TranscriptModal({
    open,
    transcript,
    editableTranscript,
    isEditing,
    onToggleEdit,
    onChange,
    onCancel,
    onConfirm,
}: TranscriptModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    if (!open || !mounted) return null;

    return createPortal(
        <div className="floating-transcript" role="dialog" aria-modal="true" aria-label="Confirm transcript">
            <div className="transcript-box">
                <div className="transcript-header">
                    <span>TRANSCRIPT DATA</span>
                    <button type="button" onClick={onToggleEdit}>
                        {isEditing ? '[ SAVE ]' : '[ EDIT ]'}
                    </button>
                </div>
                {isEditing ? (
                    <textarea
                        value={editableTranscript}
                        onChange={(e) => onChange(e.target.value)}
                    />
                ) : (
                    <p>{transcript}</p>
                )}
                <div className="transcript-btns">
                    <button type="button" className="btn-cancel" onClick={onCancel}>
                        DROP
                    </button>
                    <button type="button" className="btn-confirm" onClick={onConfirm}>
                        COMMIT
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default TranscriptModal;
