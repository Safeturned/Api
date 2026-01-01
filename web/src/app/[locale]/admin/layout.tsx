export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
