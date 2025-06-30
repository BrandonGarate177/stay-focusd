import React from 'react';

interface AttentionStatusProps{
    status: String;
    confidence: number | null;
}

const AttentionStatus: React.FC<AttentionStatusProps> = ({ status, confidence }) => (
    <div>
        <div className="attention-bar" />
        <div className="attention-label">
            {status.toUpperCase()} {confidence !== null ? `(Confidence: ${confidence.toFixed(2)})` : ''}
        </div>
    </div>
);

export default AttentionStatus;