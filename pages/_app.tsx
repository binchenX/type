import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider attribute="class">
            <Head>
                <title>QType - AI-Powered Typing Tutor</title>
                <meta name="description" content="Improve your typing skills with personalized, AI-generated lessons tailored to your unique skill level and typing patterns." />
                <meta name="keywords" content="typing tutor, AI typing coach, learn to type, typing practice, typing test, touch typing, keyboard skills" />
            </Head>
            <Component {...pageProps} />
        </ThemeProvider>
    );
} 
