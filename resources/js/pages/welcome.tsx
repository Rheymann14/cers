import { Head, Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarPlus,
    CheckCircle2,
    ClipboardList,
    FileText,
    QrCode,
    ShieldCheck,
    Users,
} from 'lucide-react';

import { dashboard, login } from '@/routes';

const navigationLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Process', href: '#process' },
    { label: 'About', href: '#about' },
];

const features = [
    {
        title: 'Online Registration',
        description:
            'Allows participants to register for CHED events through a simple and guided form.',
        icon: CalendarPlus,
    },
    {
        title: 'QR-Based Attendance',
        description:
            'Supports faster attendance checking and participant verification during events.',
        icon: QrCode,
    },
    {
        title: 'Participant Management',
        description:
            'Helps organizers manage participant records, status, and event details in one place.',
        icon: Users,
    },
    {
        title: 'Event Reports',
        description:
            'Provides organized event data that can support documentation and reporting.',
        icon: FileText,
    },
];

const processSteps = [
    'Create Event',
    'Open Registration',
    'Validate Attendance',
    'Generate Reports',
];

const visualItems = [
    { label: 'Event Registration', icon: ClipboardList },
    { label: 'QR / Attendance', icon: QrCode },
    { label: 'Participant Records', icon: Users },
    { label: 'Reports', icon: BarChart3 },
];

export default function Welcome() {
    const { auth } = usePage().props;
    const accessHref = auth.user ? dashboard() : login();
    const currentYear = new Date().getFullYear();

    return (
        <>
            <Head title="CHED Event Registration System">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-white via-[#f8fbff] to-[#eef5ff] text-slate-900">
                <header className="sticky top-0 z-50 border-b border-[#d9e5f5] bg-white/95 backdrop-blur">
                    <nav
                        className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
                        aria-label="Main navigation"
                    >
                        <a href="#home" className="flex items-center gap-3">
                            <img
                                src="/ched_logo.png"
                                alt="Commission on Higher Education logo"
                                className="h-12 w-12 object-contain"
                            />
                            <span>
                                <span className="block text-sm font-semibold tracking-wide text-slate-950">
                                    CERS
                                </span>
                                <span className="block text-xs text-slate-600 sm:text-sm">
                                    CHED Event Registration System
                                </span>
                            </span>
                        </a>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-8">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
                                {navigationLinks.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        className="transition hover:text-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>

                            <Link
                                href={accessHref}
                                className="inline-flex items-center justify-center rounded-xl border border-[#0038A8] bg-[#0038A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                            >
                                {auth.user ? 'Dashboard' : 'Login'}
                            </Link>
                        </div>
                    </nav>
                </header>

                <main id="home">
                    <section className="relative overflow-hidden">
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(252,209,22,0.20),transparent_32%),radial-gradient(circle_at_top_right,rgba(0,56,168,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.82)_100%)]" />
                        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
                            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
                                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9e5f5] bg-white px-4 py-2 text-sm font-medium text-[#0038A8] shadow-sm">
                                    <ShieldCheck className="h-4 w-4 text-[#CE1126]" />
                                    Government event registration platform
                                </div>

                                <h1 className="max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                                    CHED Event Registration System
                                </h1>

                                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                                    A centralized platform for managing event
                                    registration, participant attendance, and
                                    event-related records for CHED activities.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href={accessHref}
                                        className="inline-flex items-center justify-center rounded-xl bg-[#0038A8] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#0038A8]/15 transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                                    >
                                        Get Started
                                    </Link>
                                    <a
                                        href="#features"
                                        className="inline-flex items-center justify-center rounded-xl border border-[#d9e5f5] bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-[#0038A8]/30 hover:text-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                                    >
                                        Learn More
                                    </a>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#d9e5f5] bg-white p-5 shadow-md shadow-slate-200/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                                <div className="rounded-2xl border border-[#d9e5f5] bg-[#f8fbff] p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-[#0038A8]">
                                                Event Operations
                                            </p>
                                            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                                                CERS Workflow
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-[#FCD116] px-3 py-1 text-xs font-bold text-[#1f2937]">
                                            CHED
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                        {visualItems.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <div
                                                    key={item.label}
                                                    className="rounded-2xl border border-[#d9e5f5] bg-white p-4 shadow-sm transition hover:border-[#0038A8]/25 hover:shadow-md"
                                                >
                                                    <Icon className="h-6 w-6 text-[#0038A8]" />
                                                    <p className="mt-4 text-sm font-semibold text-slate-800">
                                                        {item.label}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    {['Secure', 'Organized', 'Accessible'].map(
                                        (item) => (
                                            <div
                                                key={item}
                                                className="flex items-center gap-2 rounded-xl border border-[#d9e5f5] bg-white px-3 py-3 text-sm font-medium text-slate-700"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-[#CE1126]" />
                                                {item}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="features" className="bg-white py-16 sm:py-20">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="max-w-2xl">
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#CE1126]">
                                    Features
                                </p>
                                <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                                    Built for efficient CHED event operations
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                {features.map((feature) => {
                                    const Icon = feature.icon;

                                    return (
                                        <article
                                            key={feature.title}
                                            className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-sm transition duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 hover:-translate-y-1 hover:border-[#0038A8]/30 hover:shadow-md"
                                        >
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#0038A8]">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="mt-5 text-lg font-semibold text-slate-950">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                                {feature.description}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section id="process" className="py-16 sm:py-20">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-sm sm:p-8">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-wide text-[#CE1126]">
                                            Process
                                        </p>
                                        <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                                            A simple registration flow
                                        </h2>
                                    </div>
                                </div>

                                <div className="mt-10 grid gap-4 md:grid-cols-4">
                                    {processSteps.map((step, index) => (
                                        <div
                                            key={step}
                                            className="relative rounded-2xl border border-[#d9e5f5] bg-[#f8fbff] p-5 transition duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 hover:border-[#0038A8]/30 hover:bg-white"
                                        >
                                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0038A8] text-sm font-bold text-white shadow-sm">
                                                {index + 1}
                                            </span>
                                            <h3 className="mt-5 text-base font-semibold text-slate-950">
                                                {step}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                {index === 0 &&
                                                    'Set up event details, schedules, and registration requirements.'}
                                                {index === 1 &&
                                                    'Publish registration access for invited participants and offices.'}
                                                {index === 2 &&
                                                    'Verify participants faster during event entry and attendance checks.'}
                                                {index === 3 &&
                                                    'Prepare organized records for documentation and reporting.'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="about" className="bg-white py-16 sm:py-20">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="overflow-hidden rounded-2xl border border-[#d9e5f5] bg-[#f8fbff] shadow-md shadow-slate-200/70 lg:flex lg:items-stretch">
                                <div className="w-full border-b border-[#d9e5f5] bg-white p-8 sm:p-10 lg:border-r lg:border-b-0">
                                    <div className="mb-6 flex h-1.5 w-28 overflow-hidden rounded-full">
                                        <span className="flex-1 bg-[#0038A8]" />
                                        <span className="flex-1 bg-[#FCD116]" />
                                        <span className="flex-1 bg-[#CE1126]" />
                                    </div>
                                    <p className="text-sm font-semibold uppercase tracking-wide text-[#CE1126]">
                                        About CERS
                                    </p>
                                    <h2 className="mt-3 max-w-3xl text-3xl font-bold text-slate-950 sm:text-4xl">
                                        Organized event registration for
                                        CHED-related activities
                                    </h2>
                                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                                        CERS is designed to support efficient,
                                        organized, and reliable event
                                        registration for CHED-related
                                        activities.
                                    </p>
                                </div>

                                <div className="flex items-center bg-[#f8fbff] p-8 sm:p-10 lg:w-80 lg:justify-center">
                                    <Link
                                        href={accessHref}
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-[#0038A8] px-6 py-3 text-sm font-bold text-white shadow-sm shadow-[#0038A8]/15 transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] sm:w-auto lg:w-full"
                                    >
                                        Access System
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                        <p>
                            &copy; {currentYear} Commission on Higher Education.
                            All rights reserved.
                        </p>
                        <p className="font-medium text-slate-700">
                            CHED Event Registration System
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
