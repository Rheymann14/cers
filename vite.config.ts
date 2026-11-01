import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rolldownOptions: {
            output: {
                // Emit .mjs assets (the pdf.js worker) as .js: production Nginx
                // serves .mjs as application/octet-stream, which browsers refuse
                // to run as a module script.
                assetFileNames: ({ names }) =>
                    names[0]?.endsWith('.mjs')
                        ? 'assets/[name]-[hash].js'
                        : 'assets/[name]-[hash][extname]',
            },
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
