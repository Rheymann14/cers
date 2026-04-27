import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src="/ched_logo.png"
            alt="Commission on Higher Education logo"
        />
    );
}
