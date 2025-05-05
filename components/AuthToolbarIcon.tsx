import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

interface AuthToolbarIconProps {
    onSettings?: () => void;
    onSignInModal?: () => void;
}

export default function AuthToolbarIcon({ onSettings }: AuthToolbarIconProps) {
    const [signedIn, setSignedIn] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setSignedIn(!!localStorage.getItem('qtype_signed_in'));
        window.addEventListener('storage', () => {
            setSignedIn(!!localStorage.getItem('qtype_signed_in'));
        });
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    if (!signedIn) {
        return (
            <button
                onClick={() => router.push('/signup')}
                style={{
                    background: '#111',
                    color: 'white',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '8px 24px',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    marginLeft: 8,
                }}
            >
                Log in
            </button>
        );
    }

    const handleIconClick = () => {
        setMenuOpen((open) => !open);
    };

    const handleSettings = () => {
        setMenuOpen(false);
        if (onSettings) {
            onSettings();
        }
    };

    const handleLogout = () => {
        setMenuOpen(false);
        localStorage.removeItem('qtype_signed_in');
        setSignedIn(false);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
            <button
                onClick={handleIconClick}
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}
                title={'Settings'}
            >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c.29.02.57.1.82.21.25.12.48.28.68.48.2.2.36.43.48.68.11.25.19.53.21.82V4.6a1.65 1.65 0 0 0 1.51 1c.29.02.57.1.82.21.25.12.48.28.68.48.2.2.36.43.48.68.11.25.19.53.21.82V8a1.65 1.65 0 0 0 1 1.51z" /></svg>
            </button>
            {menuOpen && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    minWidth: 180,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    zIndex: 9999,
                    padding: '8px 0',
                }}>
                    <button
                        onClick={handleSettings}
                        style={{
                            display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: 16, color: '#374151', gap: 10
                        }}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="3" /><path d="M16.2 12a1.38 1.38 0 0 0 .28 1.52l.05.05a1.67 1.67 0 1 1-2.38 2.38l-.05-.05a1.38 1.38 0 0 0-1.52-.28 1.38 1.38 0 0 0-.84 1.26V18a1.67 1.67 0 1 1-3.34 0v-.09A1.38 1.38 0 0 0 6 16.2a1.38 1.38 0 0 0-1.52.28l-.05.05a1.67 1.67 0 1 1-2.38-2.38l.05-.05A1.38 1.38 0 0 0 3.8 12a1.38 1.38 0 0 0-1.26-.84H2a1.67 1.67 0 1 1 0-3.34h.09A1.38 1.38 0 0 0 3.8 7.8a1.38 1.38 0 0 0-.28-1.52l-.05-.05a1.67 1.67 0 1 1 2.38-2.38l.05.05A1.38 1.38 0 0 0 6 3.8a1.38 1.38 0 0 0 .84-1.26V2a1.67 1.67 0 1 1 3.34 0v.09c.24.02.47.08.68.18.21.1.41.23.58.4.17.17.3.37.4.58.1.21.16.44.18.68V3.8a1.38 1.38 0 0 0 1.26.84c.24.02.47.08.68.18.21.1.41.23.58.4.17.17.3.37.4.58.1.21.16.44.18.68V7.8a1.38 1.38 0 0 0 .84 1.26c.24.02.47.08.68.18.21.1.41.23.58.4.17.17.3.37.4.58.1.21.16.44.18.68V12z" /></svg>
                        Settings
                    </button>
                    <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: 16, color: '#ef4444', gap: 10
                        }}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /><path d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0z" /></svg>
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
} 
