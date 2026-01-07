export const UserPermission = {
    None: 0,
    ModerateFiles: 1 << 0,
    ViewAuditLog: 1 << 1,
    ManageReports: 1 << 2,
    Administrator: 2147483647,
} as const;

export type UserPermissionType = (typeof UserPermission)[keyof typeof UserPermission];

export const PERMISSION_LABELS: Record<number, string> = {
    [UserPermission.ModerateFiles]: 'moderate_files',
    [UserPermission.ViewAuditLog]: 'view_audit_log',
    [UserPermission.ManageReports]: 'manage_reports',
};

export const PERMISSION_COLORS: Record<number, string> = {
    [UserPermission.ModerateFiles]: 'bg-orange-600',
    [UserPermission.ViewAuditLog]: 'bg-blue-600',
    [UserPermission.ManageReports]: 'bg-purple-600',
};

export const isAdministrator = (permissions: number): boolean => {
    return permissions === UserPermission.Administrator;
};

export const hasPermission = (permissions: number, required: number): boolean => {
    if (isAdministrator(permissions)) return true;
    return (permissions & required) === required;
};

export const getPermissionFlags = (permissions: number): number[] => {
    if (isAdministrator(permissions)) return [];
    const flags: number[] = [];
    if (hasPermission(permissions, UserPermission.ModerateFiles)) flags.push(UserPermission.ModerateFiles);
    if (hasPermission(permissions, UserPermission.ViewAuditLog)) flags.push(UserPermission.ViewAuditLog);
    if (hasPermission(permissions, UserPermission.ManageReports)) flags.push(UserPermission.ManageReports);
    return flags;
};

export const togglePermission = (permissions: number, flag: number): number => {
    return permissions ^ flag;
};

export const AdminVerdict = {
    None: 0,
    Trusted: 1,
    Harmful: 2,
    Suspicious: 3,
    Malware: 4,
    PUP: 5,
    FalsePositive: 6,
    TakenDown: 7,
} as const;

export type AdminVerdictType = (typeof AdminVerdict)[keyof typeof AdminVerdict];

export const VERDICT_LABELS: Record<number, string> = {
    [AdminVerdict.None]: 'None',
    [AdminVerdict.Trusted]: 'Trusted',
    [AdminVerdict.Harmful]: 'Harmful',
    [AdminVerdict.Suspicious]: 'Suspicious',
    [AdminVerdict.Malware]: 'Malware',
    [AdminVerdict.PUP]: 'PUP',
    [AdminVerdict.FalsePositive]: 'False Positive',
    [AdminVerdict.TakenDown]: 'Taken Down',
};

export const VERDICT_COLORS: Record<number, string> = {
    [AdminVerdict.None]: 'bg-gray-600',
    [AdminVerdict.Trusted]: 'bg-green-600',
    [AdminVerdict.Harmful]: 'bg-red-600',
    [AdminVerdict.Suspicious]: 'bg-yellow-600',
    [AdminVerdict.Malware]: 'bg-red-800',
    [AdminVerdict.PUP]: 'bg-orange-600',
    [AdminVerdict.FalsePositive]: 'bg-blue-600',
    [AdminVerdict.TakenDown]: 'bg-slate-600',
};

export const VERDICT_TEXT_COLORS: Record<number, string> = {
    [AdminVerdict.None]: 'text-gray-400',
    [AdminVerdict.Trusted]: 'text-green-400',
    [AdminVerdict.Harmful]: 'text-red-400',
    [AdminVerdict.Suspicious]: 'text-yellow-400',
    [AdminVerdict.Malware]: 'text-red-300',
    [AdminVerdict.PUP]: 'text-orange-400',
    [AdminVerdict.FalsePositive]: 'text-blue-400',
    [AdminVerdict.TakenDown]: 'text-slate-400',
};

export const getVerdictLabel = (verdict: number | null | undefined): string => {
    if (verdict === null || verdict === undefined) return VERDICT_LABELS[AdminVerdict.None];
    return VERDICT_LABELS[verdict] || VERDICT_LABELS[AdminVerdict.None];
};

export const getVerdictColor = (verdict: number | null | undefined): string => {
    if (verdict === null || verdict === undefined) return VERDICT_COLORS[AdminVerdict.None];
    return VERDICT_COLORS[verdict] || VERDICT_COLORS[AdminVerdict.None];
};

export const getVerdictTextColor = (verdict: number | null | undefined): string => {
    if (verdict === null || verdict === undefined) return VERDICT_TEXT_COLORS[AdminVerdict.None];
    return VERDICT_TEXT_COLORS[verdict] || VERDICT_TEXT_COLORS[AdminVerdict.None];
};
