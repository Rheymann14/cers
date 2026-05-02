import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div
                data-layout-shell="header"
                className="flex min-h-screen w-full flex-col"
            >
                {children}
            </div>
        );
    }

    return (
        <SidebarProvider data-layout-shell="sidebar" defaultOpen={isOpen}>
            {children}
        </SidebarProvider>
    );
}
