import React from 'react';
import './LCDDisplay.css';

interface LCDDisplayProps {
    label?: string;
    value: string;
    subValue?: string;
    active?: boolean;
}

export const LCDDisplay: React.FC<LCDDisplayProps> = ({
    label = "DATE IN",
    value,
    subValue,
    active = true
}) => {
    // 确保显示为硬件风的缩写
    const displaySubValue = subValue?.toUpperCase() || '';

    return (
        <div className="te-lcd-bezel-outer">
            {/* Screws */}
            <div className="lcd-screw ls-tl"></div>
            <div className="lcd-screw ls-tr"></div>
            <div className="lcd-screw ls-bl"></div>
            <div className="lcd-screw ls-br"></div>

            <div className="te-lcd-face-plate">
                {/* Top Label */}
                <div className="lcd-label-top">LCD display</div>

                {/* The Dot Matrix Screen */}
                <div className="te-matrix-screen">
                    <div className="te-matrix-content">
                        <span className="dot-text-glow">
                            {value} {displaySubValue && `${displaySubValue}`}
                        </span>
                    </div>

                    {/* Matrix Mask Grid */}
                    <div className="te-matrix-mask"></div>
                </div>

                {/* Bottom Labels */}
                <div className="lcd-labels-bottom">
                    <span>{label}</span>
                    <span>DISPLAY 01</span>
                </div>
            </div>
        </div>
    );
};
