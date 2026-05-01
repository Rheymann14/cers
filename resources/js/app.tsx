import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { initializeLayout } from '@/hooks/use-layout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'CERS';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    defaults: {
        visitOptions: (_href, options) => ({
            ...options,
            viewTransition:
                options.viewTransition ??
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        }),
    },
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#0038A8',
    },
});

// This will set light / dark mode on load...
initializeTheme();
initializeLayout();
