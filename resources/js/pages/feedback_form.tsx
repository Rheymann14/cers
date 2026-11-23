import { Head, Link, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Lock,
    MapPin,
    Moon,
    Send,
    Sun,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { StarRatingInput } from '@/components/feedback/star-rating';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

type Props = {
    form: {
        token: string;
        title: string;
        description: string | null;
        is_open: boolean;
        questions: { id: number; question: string }[];
    };
    event: {
        name: string;
        venue_name: string | null;
        date_label: string | null;
        image_url: string | null;
    };
};

type FeedbackData = {
    name: string;
    school_agency: string;
    comments: string;
    ratings: Record<string, number | null>;
};

function submittedKey(token: string): string {
    return `cers.feedback.${token}.submitted`;
}

function readSubmitted(token: string): boolean {
    try {
        return window.localStorage.getItem(submittedKey(token)) === '1';
    } catch {
        return false;
    }
}

function rememberSubmitted(token: string) {
    try {
        window.localStorage.setItem(submittedKey(token), '1');
    } catch {
        // Only used to show the thank-you message again on revisit.
    }
}

function ThemeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const next = resolvedAppearance === 'dark' ? 'light' : 'dark';
    const Icon = resolvedAppearance === 'dark' ? Sun : Moon;

    return (
        <button
            type="button"
            aria-label={`Switch to ${next} mode`}
            onClick={() => updateAppearance(next)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[#d9e5f5] bg-white text-slate-700 shadow-sm transition hover:text-[#0038A8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:text-white"
        >
            <Icon className="size-5" />
        </button>
    );
}

function StatusCard({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="grid justify-items-center gap-3 rounded-2xl border border-[#d9e5f5] bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {icon}
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                {title}
            </h2>
            <div className="max-w-md text-sm leading-6 text-slate-600 dark:text-neutral-300">
                {children}
            </div>
        </section>
    );
}

export default function FeedbackFormPage({ form, event }: Props) {
    const [submitted, setSubmitted] = useState(() => readSubmitted(form.token));
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FeedbackData>({
            name: '',
            school_agency: '',
            comments: '',
            ratings: Object.fromEntries(
                form.questions.map((question) => [String(question.id), null]),
            ),
        });
    const formErrors = errors as Record<string, string | undefined>;
    const ratedCount = form.questions.filter(
        (question) => data.ratings[question.id],
    ).length;

    function rate(questionId: number, value: number) {
        setData('ratings', { ...data.ratings, [questionId]: value });
        clearErrors(`ratings.${questionId}` as keyof FeedbackData);
    }

    function submit(submitEvent: FormEvent) {
        submitEvent.preventDefault();

        post(`/feedback/${form.token}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                rememberSubmitted(form.token);
                reset();
                setSubmitted(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onError: (validationErrors) => {
                const firstQuestion = form.questions.find(
                    (question) => validationErrors[`ratings.${question.id}`],
                );

                if (firstQuestion) {
                    document
                        .getElementById(`question-${firstQuestion.id}`)
                        ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                }
            },
        });
    }

    return (
        <>
            <Head title={`Feedback · ${event.name}`}>
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-[#f5f9ff] text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
                <header className="border-b border-[#d9e5f5] bg-white/95 dark:border-neutral-800 dark:bg-neutral-950/90">
                    <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
                        <Link
                            href="/events"
                            className="flex min-w-0 items-center gap-3"
                        >
                            <img
                                src="/ched_logo-128.png"
                                alt="Commission on Higher Education logo"
                                className="size-10 shrink-0 object-contain"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold tracking-wide text-slate-950 dark:text-white">
                                    CERS
                                </span>
                                <span className="block truncate text-xs text-slate-600 dark:text-neutral-400">
                                    CHED Events Registration System
                                </span>
                            </span>
                        </Link>
                        <ThemeToggle />
                    </div>
                </header>

                <main className="mx-auto grid max-w-2xl gap-4 px-4 py-5">
                    <section className="overflow-hidden rounded-2xl border border-[#d9e5f5] bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="h-1.5 bg-[#0038A8] dark:bg-blue-500" />
                        <div className="grid gap-3 p-5">
                            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#0038A8] uppercase dark:text-blue-300">
                                Event Feedback
                            </p>
                            <h1 className="text-xl leading-snug font-bold break-words text-slate-950 sm:text-2xl dark:text-white">
                                {event.name}
                            </h1>
                            <div className="flex flex-wrap gap-2 text-xs font-medium">
                                {event.date_label && (
                                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
                                        <CalendarDays className="size-3.5" />
                                        {event.date_label}
                                    </span>
                                )}
                                {event.venue_name && (
                                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                        <MapPin className="size-3.5" />
                                        {event.venue_name}
                                    </span>
                                )}
                            </div>
                            {!submitted && form.is_open && (
                                <div className="grid gap-1 border-t border-[#d9e5f5] pt-3 dark:border-neutral-800">
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                        {form.title}
                                    </h2>
                                    {form.description && (
                                        <p className="text-sm leading-6 whitespace-pre-line text-slate-600 dark:text-neutral-300">
                                            {form.description}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {submitted ? (
                        <StatusCard
                            icon={
                                <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400" />
                            }
                            title="Thank you for your feedback!"
                        >
                            <p>
                                Your response has been recorded. It helps us
                                make future events even better.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Button asChild variant="outline">
                                    <Link href="/events">Browse events</Link>
                                </Button>
                                {form.is_open && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setSubmitted(false)}
                                    >
                                        Submit another response
                                    </Button>
                                )}
                            </div>
                        </StatusCard>
                    ) : !form.is_open ? (
                        <StatusCard
                            icon={
                                <Lock className="size-10 text-slate-400 dark:text-neutral-500" />
                            }
                            title="Feedback is closed"
                        >
                            <p>
                                This feedback form is no longer accepting
                                responses. Thank you for your interest.
                            </p>
                        </StatusCard>
                    ) : (
                        <form onSubmit={submit} className="grid gap-4">
                            <section className="grid gap-4 rounded-2xl border border-[#d9e5f5] bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-name">
                                        Name{' '}
                                        <span className="font-normal text-slate-500 dark:text-neutral-400">
                                            (optional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="feedback-name"
                                        value={data.name}
                                        onChange={(changeEvent) =>
                                            setData(
                                                'name',
                                                changeEvent.target.value,
                                            )
                                        }
                                        maxLength={150}
                                        autoComplete="name"
                                        placeholder="Leave blank to stay anonymous"
                                        className="h-11"
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-school">
                                        School / Agency{' '}
                                        <span className="font-normal text-slate-500 dark:text-neutral-400">
                                            (optional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="feedback-school"
                                        value={data.school_agency}
                                        onChange={(changeEvent) =>
                                            setData(
                                                'school_agency',
                                                changeEvent.target.value,
                                            )
                                        }
                                        maxLength={255}
                                        autoComplete="organization"
                                        className="h-11"
                                    />
                                    <InputError
                                        message={errors.school_agency}
                                    />
                                </div>
                            </section>

                            <section className="grid gap-1 rounded-2xl border border-[#d9e5f5] bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="flex items-baseline justify-between gap-3 pb-2">
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                        Rate your experience
                                    </h2>
                                    <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums dark:text-neutral-400">
                                        {ratedCount} of {form.questions.length}{' '}
                                        rated
                                    </span>
                                </div>
                                <p className="pb-2 text-xs text-slate-500 dark:text-neutral-400">
                                    1 star = Poor &middot; 5 stars = Excellent.
                                    All ratings are required.
                                </p>
                                <ol className="grid">
                                    {form.questions.map((question, index) => {
                                        const error =
                                            formErrors[
                                                `ratings.${question.id}`
                                            ];

                                        return (
                                            <li
                                                key={question.id}
                                                id={`question-${question.id}`}
                                                className={cn(
                                                    'grid scroll-mt-24 gap-2 border-t border-[#e8eef8] py-4 first:border-t-0 dark:border-neutral-800',
                                                    error &&
                                                        '-mx-2 rounded-lg bg-red-50/70 px-2 dark:bg-red-950/20',
                                                )}
                                            >
                                                <p className="text-sm leading-6 font-medium text-slate-800 dark:text-neutral-100">
                                                    <span className="mr-1 text-[#0038A8] dark:text-blue-300">
                                                        {index + 1}.
                                                    </span>
                                                    {question.question}
                                                    <span
                                                        className="ml-0.5 text-red-600"
                                                        aria-hidden="true"
                                                    >
                                                        *
                                                    </span>
                                                </p>
                                                <StarRatingInput
                                                    label={`${index + 1}. ${question.question}`}
                                                    value={
                                                        data.ratings[
                                                            question.id
                                                        ] ?? null
                                                    }
                                                    onChange={(value) =>
                                                        rate(question.id, value)
                                                    }
                                                    invalid={Boolean(error)}
                                                    disabled={processing}
                                                />
                                                <InputError
                                                    message={error}
                                                    className="text-xs"
                                                />
                                            </li>
                                        );
                                    })}
                                </ol>
                            </section>

                            <section className="grid gap-2 rounded-2xl border border-[#d9e5f5] bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                                <Label htmlFor="feedback-comments">
                                    Comments / Suggestions{' '}
                                    <span className="font-normal text-slate-500 dark:text-neutral-400">
                                        (optional)
                                    </span>
                                </Label>
                                <Textarea
                                    id="feedback-comments"
                                    value={data.comments}
                                    onChange={(changeEvent) =>
                                        setData(
                                            'comments',
                                            changeEvent.target.value,
                                        )
                                    }
                                    rows={5}
                                    maxLength={2000}
                                    placeholder="What did you like? What can we improve?"
                                />
                                <div className="flex justify-between gap-2">
                                    <InputError message={errors.comments} />
                                    <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                                        {data.comments.length}/2000
                                    </span>
                                </div>
                            </section>

                            {formErrors.form && (
                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                    {formErrors.form}
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-12 rounded-xl bg-[#0038A8] text-base font-semibold text-white hover:bg-[#002f8f] dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                                <Send className="size-4" />
                                {processing
                                    ? 'Submitting...'
                                    : 'Submit feedback'}
                            </Button>
                        </form>
                    )}
                </main>
            </div>
        </>
    );
}
