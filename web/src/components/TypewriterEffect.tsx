'use client';

import { useEffect, useState } from 'react';

interface TypewriterEffectProps {
    text: string;
    speed?: number; // milliseconds per character
    className?: string;
}

export default function TypewriterEffect({
    text,
    speed = 100,
    className = '',
}: TypewriterEffectProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (displayedText.length < text.length) {
            // Add next character
            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, speed);
            return () => clearTimeout(timeout);
        } else if (displayedText.length > text.length) {
            // Remove extra characters if text changed to something shorter
            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length - 1));
            }, speed);
            return () => clearTimeout(timeout);
        } else {
            // Text is complete
            setIsComplete(true);
        }
    }, [displayedText, text, speed]);

    return (
        <span className={className}>
            {displayedText}
            {!isComplete && <span className='animate-pulse'>|</span>}
        </span>
    );
}
