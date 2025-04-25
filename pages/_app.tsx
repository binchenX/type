import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import Head from 'next/head';
import Script from 'next/script';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider attribute="data-theme">
            <Head>
                <title>QType - AI-Powered Typing Tutor</title>
                <meta name="description" content="Improve your typing skills with personalized, AI-generated lessons tailored to your unique skill level and typing patterns." />
                <meta name="keywords" content="typing tutor, AI typing coach, learn to type, typing practice, typing test, touch typing, keyboard skills" />
            </Head>

            {/* Google AdSense Script using next/script */}
            <Script
                id="google-adsense"
                async
                strategy="afterInteractive"
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5494979508153382"
                crossOrigin="anonymous"
            />

            <Component {...pageProps} />
        </ThemeProvider>
    );
} 
