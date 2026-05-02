import { useSyncExternalStore } from 'react';
import type { AppVariant } from '@/types';

export type Layout = AppVariant;

type UseLayoutReturn = {
    readonly layout: Layout;
    readonly updateLayout: (layout: Layout) => void;
};

const layouts: readonly Layout[] = ['sidebar', 'header'];
const listeners = new Set<() => void>();

const isLayout = (value: string | null): value is Layout => {
    return layouts.includes(value as Layout);
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredLayout = (): Layout => {
    if (typeof window === 'undefined') {
        return 'sidebar';
    }

    const appliedLayout = document.documentElement.dataset.layout ?? null;

    if (isLayout(appliedLayout)) {
        return appliedLayout;
    }

    const storedLayout = localStorage.getItem('layout');

    return isLayout(storedLayout) ? storedLayout : 'sidebar';
};

let currentLayout: Layout = getStoredLayout();

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const applyLayout = (layout: Layout): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.layout = layout;
};

export function initializeLayout(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentLayout = getStoredLayout();
    applyLayout(currentLayout);

    if (!localStorage.getItem('layout')) {
        localStorage.setItem('layout', currentLayout);
        setCookie('layout', currentLayout);
    }
}

export function useLayout(): UseLayoutReturn {
    const layout: Layout = useSyncExternalStore(
        subscribe,
        () => getStoredLayout(),
        () => 'sidebar' as Layout,
    );

    const updateLayout = (layout: Layout): void => {
        currentLayout = layout;
        localStorage.setItem('layout', layout);
        setCookie('layout', layout);
        applyLayout(layout);
        notify();
    };

    return { layout, updateLayout } as const;
}
