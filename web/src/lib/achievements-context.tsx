'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { STORAGE_KEYS } from './storage-constants';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    maxProgress?: number;
}

interface AchievementsContextType {
    achievements: Achievement[];
    unlockAchievement: (id: string) => void;
    updateProgress: (id: string, progress: number) => void;
    showAchievementToast: Achievement | null;
    dismissToast: () => void;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_scan',
        title: 'First Steps',
        description: 'Upload your first file for scanning',
        icon: '🎯',
        unlocked: false,
    },
    {
        id: 'power_user',
        title: 'Power User',
        description: 'Scan 10 files',
        icon: '⚡',
        unlocked: false,
        progress: 0,
        maxProgress: 10,
    },
    {
        id: 'century_club',
        title: 'Century Club',
        description: 'Scan 100 files',
        icon: '💯',
        unlocked: false,
        progress: 0,
        maxProgress: 100,
    },
    {
        id: 'api_master',
        title: 'API Master',
        description: 'Create your first API key',
        icon: '🔑',
        unlocked: false,
    },
    {
        id: 'badge_creator',
        title: 'Badge Creator',
        description: 'Create your first badge',
        icon: '🏆',
        unlocked: false,
    },
    {
        id: 'clean_streak',
        title: 'Clean Streak',
        description: 'Scan 5 files with 0 threats in a row',
        icon: '✨',
        unlocked: false,
        progress: 0,
        maxProgress: 5,
    },
    {
        id: 'threat_hunter',
        title: 'Threat Hunter',
        description: 'Detect your first high-risk file (score > 80)',
        icon: '🚨',
        unlocked: false,
    },
    {
        id: 'early_adopter',
        title: 'Early Adopter',
        description: 'Join Safeturned in the first month',
        icon: '🌟',
        unlocked: false,
    },
];

export function AchievementsProvider({ children }: { children: ReactNode }) {
    const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
    const [showAchievementToast, setShowAchievementToast] = useState<Achievement | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setAchievements(parsed);
            } catch (error) {
                console.error('Failed to parse achievements:', error);
            }
        }

        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    const saveAchievements = (newAchievements: Achievement[]) => {
        setAchievements(newAchievements);
        localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(newAchievements));
    };

    const unlockAchievement = (id: string) => {
        const achievement = achievements.find(a => a.id === id);
        if (!achievement || achievement.unlocked) return;

        const newAchievements = achievements.map(a =>
            a.id === id ? { ...a, unlocked: true, unlockedAt: new Date() } : a
        );

        saveAchievements(newAchievements);
        setShowAchievementToast(newAchievements.find(a => a.id === id) || null);

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => {
            setShowAchievementToast(null);
            toastTimeoutRef.current = null;
        }, 5000);
    };

    const updateProgress = (id: string, progress: number) => {
        const achievement = achievements.find(a => a.id === id);
        if (!achievement || achievement.unlocked) return;

        const newProgress = Math.min(progress, achievement.maxProgress || 0);
        const newAchievements = achievements.map(a =>
            a.id === id ? { ...a, progress: newProgress } : a
        );

        saveAchievements(newAchievements);

        if (achievement.maxProgress && newProgress >= achievement.maxProgress) {
            unlockAchievement(id);
        }
    };

    const dismissToast = () => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setShowAchievementToast(null);
    };

    return (
        <AchievementsContext.Provider
            value={{
                achievements,
                unlockAchievement,
                updateProgress,
                showAchievementToast,
                dismissToast,
            }}
        >
            {children}
        </AchievementsContext.Provider>
    );
}

export function useAchievements() {
    const context = useContext(AchievementsContext);
    if (!context) {
        throw new Error('useAchievements must be used within AchievementsProvider');
    }
    return context;
}
