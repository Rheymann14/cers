import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
    size = 'default',
}: AuthLayoutProps) {
    return (
        <div className="min-h-svh bg-gradient-to-br from-white via-[#f8fbff] to-[#eef5ff] text-slate-900 dark:from-neutral-950 dark:via-neutral-950 dark:to-slate-900 dark:text-neutral-100">
            <div className="mx-auto flex min-h-svh max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
                <div
                    className={cn(
                        'mx-auto w-full',
                        size === 'wide' ? 'max-w-3xl' : 'max-w-md',
                    )}
                >
                    <div className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-md shadow-slate-200/70 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30">
                        <div className="mb-8 flex flex-col items-center gap-4">
                            <Link
                                href={home()}
                                className="flex flex-col items-center gap-2 font-medium"
                            >
                                <AppLogoIcon className="h-14 w-14 object-contain" />
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-2 text-center">
                                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                                    {title}
                                </h1>
                                <p className="text-center text-sm leading-6 text-slate-600 dark:text-neutral-400">
                                    {description}
                                </p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
