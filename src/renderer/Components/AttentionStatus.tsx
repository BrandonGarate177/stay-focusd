import React, { useEffect } from 'react';

interface AttentionStatusProps{
    status: String;
    confidence: number | null;
}

const AttentionStatus: React.FC<AttentionStatusProps> = ({ status, confidence }) => {
    // Log the received confidence value to debug
    useEffect(() => {
        console.log(`Received confidence: ${confidence}, type: ${typeof confidence}`);
        // Check both raw value and percentage value (multiplied by 100)
        console.log(`Raw comparison: ${confidence && confidence > 40}`);
        console.log(`Percentage comparison: ${confidence && (confidence * 100) > 40}`);
    }, [confidence]);

    // Handle both scales (0-1 and 0-100) for confidence value
    const displayStatus = (confidence &&
        (confidence > 0.4 || confidence > 40)) ? "LOCKED IN" : "SLUMPED";

    return (
        <div>
            <div className="attention-bar" />
            <div className="attention-label">
                {displayStatus}
            </div>
        </div>
    );
};

export default AttentionStatus;