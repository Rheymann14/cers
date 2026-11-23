import { useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Info,
    ListPlus,
    MessageSquareText,
    Plus,
    Save,
    Star,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type FeedbackQuestion = {
    id: number;
    question: string;
};

export type FeedbackFormSettings = {
    id: number;
    token: string;
    url: string;
    title: string;
    description: string | null;
    is_open: boolean;
    response_count: number;
    questions: FeedbackQuestion[];
    created_at: string | null;
    updated_at: string | null;
};

type QuestionRow = {
    key: string;
    id: number | null;
    question: string;
};

type BuilderForm = {
    title: string;
    description: string;
    is_open: boolean;
    questions: QuestionRow[];
};

let questionKey = 0;

function nextQuestionKey(): string {
    questionKey += 1;

    return `question-${questionKey}`;
}

export default function FeedbackFormDialog({
    open,
    onOpenChange,
    eventId,
    eventName,
    form,
    defaultQuestions,
    maxQuestions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: number;
    eventName: string;
    form: FeedbackFormSettings | null;
    defaultQuestions: string[];
    maxQuestions: number;
}) {
    const isNew = form === null;
    const { data, setData, transform, put, processing, errors } =
        useForm<BuilderForm>({
            title: form?.title ?? `${eventName} Feedback`.slice(0, 150),
            description:
                form?.description ??
                (isNew
                    ? 'Thank you for joining us! Please rate the following and share your comments to help us improve future events.'
                    : ''),
            is_open: true,
            questions: (form
                ? form.questions
                : defaultQuestions.map((question) => ({ id: null, question }))
            ).map((question) => ({
                key: nextQuestionKey(),
                id: question.id,
                question: question.question,
            })),
        });
    const formErrors = errors as Record<string, string | undefined>;
    const originalIds = new Set(form?.questions.map((question) => question.id));
    const removedAnsweredQuestions =
        (form?.response_count ?? 0) > 0 &&
        [...originalIds].some(
            (id) => !data.questions.some((question) => question.id === id),
        );

    function updateQuestion(index: number, value: string) {
        setData(
            'questions',
            data.questions.map((question, questionIndex) =>
                questionIndex === index
                    ? { ...question, question: value }
                    : question,
            ),
        );
    }

    function moveQuestion(index: number, offset: number) {
        const target = index + offset;

        if (target < 0 || target >= data.questions.length) {
            return;
        }

        const questions = [...data.questions];
        [questions[index], questions[target]] = [
            questions[target],
            questions[index],
        ];
        setData('questions', questions);
    }

    function removeQuestion(index: number) {
        setData(
            'questions',
            data.questions.filter(
                (_, questionIndex) => questionIndex !== index,
            ),
        );
    }

    function addQuestion() {
        if (data.questions.length >= maxQuestions) {
            return;
        }

        setData('questions', [
            ...data.questions,
            { key: nextQuestionKey(), id: null, question: '' },
        ]);
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        transform((current) => ({
            title: current.title,
            description: current.description,
            is_open: current.is_open,
            questions: current.questions.map(({ id, question }) => ({
                id,
                question,
            })),
        }));
        put(`/feedback-forms/${eventId}`, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col gap-0 p-0 sm:max-h-[90dvh] sm:max-w-2xl">
                <DialogHeader className="shrink-0 gap-1 border-b p-4 text-left">
                    <DialogTitle className="inline-flex items-center gap-2 text-base">
                        <MessageSquareText className="size-4 text-muted-foreground" />
                        {isNew ? 'Create feedback form' : 'Edit feedback form'}
                    </DialogTitle>
                    <DialogDescription className="text-xs leading-5">
                        {eventName}
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="feedback-form-builder"
                    onSubmit={submit}
                    className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="feedback-title">Form title</Label>
                        <Input
                            id="feedback-title"
                            value={data.title}
                            onChange={(event) =>
                                setData('title', event.target.value)
                            }
                            maxLength={150}
                            aria-invalid={Boolean(errors.title) || undefined}
                            required
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="feedback-description">
                            Instructions{' '}
                            <span className="font-normal text-muted-foreground">
                                (optional)
                            </span>
                        </Label>
                        <Textarea
                            id="feedback-description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            maxLength={1000}
                            rows={2}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <p className="text-sm font-medium">
                                    Rating questions
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Each question is answered with a required
                                    1&ndash;5 star rating.
                                </p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {data.questions.length}/{maxQuestions}
                            </span>
                        </div>

                        <ol className="grid gap-2">
                            {data.questions.map((question, index) => {
                                const error =
                                    formErrors[`questions.${index}.question`];

                                return (
                                    <li
                                        key={question.key}
                                        className="grid gap-1 rounded-lg border bg-muted/20 p-2"
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="mt-2 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0038A8] text-[10px] font-semibold text-white dark:bg-blue-500">
                                                {index + 1}
                                            </span>
                                            <Textarea
                                                value={question.question}
                                                onChange={(event) =>
                                                    updateQuestion(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                rows={1}
                                                maxLength={500}
                                                placeholder="e.g. The session met my expectations."
                                                aria-label={`Question ${index + 1}`}
                                                aria-invalid={
                                                    Boolean(error) || undefined
                                                }
                                                className="field-sizing-content min-h-9 resize-none bg-background"
                                                required
                                            />
                                            <div className="flex shrink-0 items-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    aria-label={`Move question ${index + 1} up`}
                                                    disabled={index === 0}
                                                    onClick={() =>
                                                        moveQuestion(index, -1)
                                                    }
                                                >
                                                    <ArrowUp className="size-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    aria-label={`Move question ${index + 1} down`}
                                                    disabled={
                                                        index ===
                                                        data.questions.length -
                                                            1
                                                    }
                                                    onClick={() =>
                                                        moveQuestion(index, 1)
                                                    }
                                                >
                                                    <ArrowDown className="size-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-destructive hover:text-destructive"
                                                    aria-label={`Remove question ${index + 1}`}
                                                    disabled={
                                                        data.questions
                                                            .length === 1
                                                    }
                                                    onClick={() =>
                                                        removeQuestion(index)
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <InputError
                                            message={error}
                                            className="pl-7 text-xs"
                                        />
                                    </li>
                                );
                            })}
                        </ol>
                        <InputError message={errors.questions} />

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addQuestion}
                                disabled={data.questions.length >= maxQuestions}
                                className="h-8 px-2 text-xs"
                            >
                                <Plus className="size-3.5" />
                                Add question
                            </Button>
                            {data.questions.length === 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setData(
                                            'questions',
                                            defaultQuestions.map(
                                                (question) => ({
                                                    key: nextQuestionKey(),
                                                    id: null,
                                                    question,
                                                }),
                                            ),
                                        )
                                    }
                                    className="h-8 px-2 text-xs"
                                >
                                    <ListPlus className="size-3.5" />
                                    Use suggested questions
                                </Button>
                            )}
                        </div>

                        {removedAnsweredQuestions && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                Removing a question also deletes the ratings
                                already submitted for it.
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                        <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <Info className="size-3.5" />
                            Always included on the form
                        </p>
                        <ul className="grid gap-1 pl-5 sm:grid-cols-3 sm:pl-0">
                            <li className="list-disc sm:list-none">
                                Name (optional)
                            </li>
                            <li className="list-disc sm:list-none">
                                School / Agency (optional)
                            </li>
                            <li className="list-disc sm:list-none">
                                Comments / Suggestions (optional)
                            </li>
                        </ul>
                        <p className="inline-flex items-center gap-1.5">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            Star ratings are required for every question.
                        </p>
                    </div>

                    {isNew && (
                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox
                                checked={data.is_open}
                                onCheckedChange={(checked) =>
                                    setData('is_open', checked === true)
                                }
                                className="mt-0.5"
                            />
                            <span>
                                Open for responses now
                                <span className="block text-xs text-muted-foreground">
                                    You can open or close responses anytime.
                                </span>
                            </span>
                        </label>
                    )}
                </form>

                <DialogFooter className="shrink-0 border-t p-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="feedback-form-builder"
                        disabled={processing}
                    >
                        <Save className="size-4" />
                        {isNew ? 'Create & generate QR' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
