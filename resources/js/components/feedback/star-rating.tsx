import { Star } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export const ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very good',
    5: 'Excellent',
};

const STARS = [1, 2, 3, 4, 5];

/**
 * Read-only stars for averages; fills partially for fractional values.
 */
export function StarDisplay({
    value,
    className,
    starClassName = 'size-3.5',
}: {
    value: number | null;
    className?: string;
    starClassName?: string;
}) {
    const rating = Math.max(0, Math.min(5, value ?? 0));

    return (
        <span
            className={cn('inline-flex items-center gap-0.5', className)}
            role="img"
            aria-label={
                value === null
                    ? 'No rating'
                    : `${rating.toFixed(1)} out of 5 stars`
            }
        >
            {STARS.map((star) => {
                const fill = Math.max(0, Math.min(1, rating - (star - 1)));

                return (
                    <span key={star} className="relative inline-flex">
                        <Star
                            className={cn(
                                'text-slate-300 dark:text-neutral-600',
                                starClassName,
                            )}
                        />
                        {fill > 0 && (
                            <span
                                className="absolute inset-0 overflow-hidden"
                                style={{ width: `${fill * 100}%` }}
                            >
                                <Star
                                    className={cn(
                                        'fill-amber-400 text-amber-400',
                                        starClassName,
                                    )}
                                />
                            </span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

/**
 * A required 1-5 star input that behaves like a radio group (arrow keys move the rating).
 */
export function StarRatingInput({
    value,
    onChange,
    label,
    invalid = false,
    disabled = false,
}: {
    value: number | null;
    onChange: (value: number) => void;
    label: string;
    invalid?: boolean;
    disabled?: boolean;
}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
    const shown = hovered ?? value ?? 0;
    const focusable = value ?? 1;

    function select(star: number) {
        onChange(star);
        buttonsRef.current[star - 1]?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        const current = value ?? 0;

        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            select(Math.min(5, current + 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            select(Math.max(1, current - 1));
        } else if (event.key === 'Home') {
            event.preventDefault();
            select(1);
        } else if (event.key === 'End') {
            event.preventDefault();
            select(5);
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div
                role="radiogroup"
                aria-label={label}
                aria-required="true"
                aria-invalid={invalid || undefined}
                className="inline-flex items-center gap-1"
                onMouseLeave={() => setHovered(null)}
            >
                {STARS.map((star) => {
                    const active = star <= shown;

                    return (
                        <button
                            key={star}
                            ref={(element) => {
                                buttonsRef.current[star - 1] = element;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={value === star}
                            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}, ${ratingLabels[star]}`}
                            tabIndex={star === focusable ? 0 : -1}
                            disabled={disabled}
                            onClick={() => onChange(star)}
                            onMouseEnter={() => setHovered(star)}
                            onKeyDown={handleKeyDown}
                            className="rounded-md p-1 transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0038A8] disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:outline-blue-300"
                        >
                            <Star
                                className={cn(
                                    'size-8 transition sm:size-9',
                                    active
                                        ? 'fill-amber-400 text-amber-400'
                                        : invalid
                                          ? 'text-red-300 dark:text-red-900'
                                          : 'text-slate-300 dark:text-neutral-600',
                                    hovered === star && 'scale-110',
                                )}
                            />
                        </button>
                    );
                })}
            </div>
            <span
                className={cn(
                    'min-w-20 text-sm font-medium',
                    shown
                        ? 'text-slate-700 dark:text-neutral-200'
                        : 'text-slate-400 dark:text-neutral-500',
                )}
                aria-hidden="true"
            >
                {shown ? ratingLabels[shown] : 'Tap to rate'}
            </span>
        </div>
    );
}
