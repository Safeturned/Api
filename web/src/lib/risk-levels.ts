export const RiskLevel = {
    HIGH: 'high',
    MODERATE: 'moderate',
    LOW: 'low',
    SAFE: 'safe',
} as const;

export type RiskLevelType = (typeof RiskLevel)[keyof typeof RiskLevel];

export const AdminVerdictName = {
    NONE: 'None',
    TRUSTED: 'Trusted',
    HARMFUL: 'Harmful',
    SUSPICIOUS: 'Suspicious',
    MALWARE: 'Malware',
    PUP: 'PUP',
    FALSE_POSITIVE: 'FalsePositive',
    TAKEN_DOWN: 'TakenDown',
    CLEAN: 'Clean',
} as const;

export type AdminVerdictNameType = (typeof AdminVerdictName)[keyof typeof AdminVerdictName];

const HIGH_RISK_VERDICTS: readonly string[] = [
    AdminVerdictName.MALWARE,
    AdminVerdictName.TAKEN_DOWN,
    AdminVerdictName.HARMFUL,
];

const MODERATE_RISK_VERDICTS: readonly string[] = [AdminVerdictName.SUSPICIOUS];

const LOW_RISK_VERDICTS: readonly string[] = [AdminVerdictName.PUP];

const SAFE_VERDICTS: readonly string[] = [
    AdminVerdictName.CLEAN,
    AdminVerdictName.FALSE_POSITIVE,
    AdminVerdictName.TRUSTED,
];

export function getEffectiveRiskLevel(score: number, adminVerdict?: string): RiskLevelType {
    if (adminVerdict && adminVerdict !== AdminVerdictName.NONE) {
        if (HIGH_RISK_VERDICTS.includes(adminVerdict)) return RiskLevel.HIGH;
        if (MODERATE_RISK_VERDICTS.includes(adminVerdict)) return RiskLevel.MODERATE;
        if (LOW_RISK_VERDICTS.includes(adminVerdict)) return RiskLevel.LOW;
        if (SAFE_VERDICTS.includes(adminVerdict)) return RiskLevel.SAFE;
    }
    if (score >= 75) return RiskLevel.HIGH;
    if (score >= 50) return RiskLevel.MODERATE;
    if (score >= 25) return RiskLevel.LOW;
    return RiskLevel.SAFE;
}

export const RISK_LEVEL_LABELS: Record<RiskLevelType, string> = {
    [RiskLevel.HIGH]: 'DANGEROUS',
    [RiskLevel.MODERATE]: 'SUSPICIOUS',
    [RiskLevel.LOW]: 'CAUTION',
    [RiskLevel.SAFE]: 'SAFE',
};

export function getRiskLabel(riskLevel: RiskLevelType): string {
    return RISK_LEVEL_LABELS[riskLevel];
}

export interface RiskColors {
    primary: string;
    secondary: string;
    glow: string;
}

export const RISK_LEVEL_COLORS: Record<RiskLevelType, RiskColors> = {
    [RiskLevel.HIGH]: { primary: '#ff4757', secondary: '#ff6b81', glow: '#ff4757' },
    [RiskLevel.MODERATE]: { primary: '#ffa502', secondary: '#ffbe76', glow: '#ffa502' },
    [RiskLevel.LOW]: { primary: '#ffd93d', secondary: '#ffe066', glow: '#ffd93d' },
    [RiskLevel.SAFE]: { primary: '#2ed573', secondary: '#7bed9f', glow: '#2ed573' },
};

export function getRiskColors(riskLevel: RiskLevelType): RiskColors {
    return RISK_LEVEL_COLORS[riskLevel];
}

export const RISK_LEVEL_EMOJIS: Record<RiskLevelType, string> = {
    [RiskLevel.HIGH]: '🚨',
    [RiskLevel.MODERATE]: '⚠️',
    [RiskLevel.LOW]: '⚡',
    [RiskLevel.SAFE]: '✅',
};

export function getRiskEmoji(riskLevel: RiskLevelType): string {
    return RISK_LEVEL_EMOJIS[riskLevel];
}

export const RISK_LEVEL_BG_CLASSES: Record<RiskLevelType, string> = {
    [RiskLevel.HIGH]: 'bg-red-900/20 border-red-500/50',
    [RiskLevel.MODERATE]: 'bg-orange-900/20 border-orange-500/50',
    [RiskLevel.LOW]: 'bg-yellow-900/20 border-yellow-500/50',
    [RiskLevel.SAFE]: 'bg-green-900/20 border-green-500/50',
};

export function getRiskBgClass(riskLevel: RiskLevelType): string {
    return RISK_LEVEL_BG_CLASSES[riskLevel];
}
