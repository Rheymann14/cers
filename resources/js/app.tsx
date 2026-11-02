import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { initializeLayout } from '@/hooks/use-layout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'CERS';

// Set persisted UI preferences before the first React render.
initializeTheme();
initializeLayout();

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    defaults: {
        // Only cross-fade real page navigations. Partial reloads (deferred
        // props, filter requests, form submits) would otherwise snapshot and
        // fade the whole page each time, which looks like a flicker.
        visitOptions: (_href, options) => ({
            ...options,
            viewTransition:
                options.viewTransition ??
                ((options.method ?? 'get') === 'get' &&
                    !options.only?.length &&
                    !options.except?.length &&
                    !options.preserveState &&
                    !window.matchMedia('(prefers-reduced-motion: reduce)')
                        .matches),
        }),
    },
    layout: (name) => {
        switch (true) {
            case name === 'welcome' || name === 'events':
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
