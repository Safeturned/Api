'use client';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] rounded ${className}`}
        />
    );
}

export function BadgeCardSkeleton() {
    return (
        <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6'>
            <div className='flex items-center justify-between mb-4'>
                <div className='space-y-2'>
                    <Skeleton className='h-6 w-48' />
                    <Skeleton className='h-4 w-32' />
                </div>
                <Skeleton className='h-12 w-12 rounded-lg' />
            </div>
            <div className='space-y-3 mb-4'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-3/4' />
            </div>
            <div className='flex gap-3'>
                <Skeleton className='h-10 w-32' />
                <Skeleton className='h-10 w-28' />
                <Skeleton className='h-10 w-24' />
            </div>
        </div>
    );
}

export function UserCardSkeleton() {
    return (
        <tr className='border-b border-slate-700/50'>
            <td className='p-4'>
                <div className='flex items-center gap-3'>
                    <Skeleton className='w-10 h-10 rounded-full' />
                    <div className='space-y-2'>
                        <Skeleton className='h-4 w-40' />
                        <Skeleton className='h-3 w-48' />
                    </div>
                </div>
            </td>
            <td className='p-4'>
                <Skeleton className='h-8 w-32' />
            </td>
            <td className='p-4'>
                <Skeleton className='h-6 w-16 rounded-full' />
            </td>
            <td className='p-4'>
                <div className='space-y-2'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-4 w-28' />
                </div>
            </td>
            <td className='p-4'>
                <div className='flex gap-2'>
                    <Skeleton className='h-8 w-24' />
                    <Skeleton className='h-8 w-20' />
                </div>
            </td>
        </tr>
    );
}

export function NotificationCardSkeleton() {
    return (
        <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6'>
            <div className='flex items-start gap-4'>
                <Skeleton className='w-8 h-8 rounded-full flex-shrink-0' />
                <div className='flex-1 space-y-3'>
                    <Skeleton className='h-5 w-3/4' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-3 w-32' />
                </div>
            </div>
        </div>
    );
}

export function ApiKeyCardSkeleton() {
    return (
        <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6'>
            <div className='flex items-center justify-between mb-4'>
                <div className='space-y-2 flex-1'>
                    <Skeleton className='h-5 w-48' />
                    <Skeleton className='h-4 w-64' />
                </div>
                <Skeleton className='h-10 w-20' />
            </div>
            <div className='flex gap-3'>
                <Skeleton className='h-9 w-24' />
                <Skeleton className='h-9 w-24' />
            </div>
        </div>
    );
}

export function ScanResultSkeleton() {
    return (
        <div className='max-w-4xl mx-auto px-6 py-12'>
            <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8'>
                <div className='text-center mb-8'>
                    <Skeleton className='h-8 w-64 mx-auto mb-4' />
                    <Skeleton className='h-24 w-24 rounded-full mx-auto mb-4' />
                    <Skeleton className='h-10 w-48 mx-auto' />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className='space-y-2'>
                            <Skeleton className='h-4 w-24' />
                            <Skeleton className='h-6 w-full' />
                        </div>
                    ))}
                </div>

                <div className='space-y-3'>
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className='h-12 w-full' />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DashboardStatsSkeleton() {
    return (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            {[...Array(3)].map((_, i) => (
                <div
                    key={i}
                    className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6'
                >
                    <Skeleton className='h-4 w-24 mb-3' />
                    <Skeleton className='h-8 w-20 mb-2' />
                    <Skeleton className='h-3 w-32' />
                </div>
            ))}
        </div>
    );
}
