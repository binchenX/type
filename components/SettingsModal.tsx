import ThemeToggle from '@/components/ThemeToggle';
import KeyboardToggle from '@/components/KeyboardToggle';
import { useTheme } from 'next-themes';

interface SettingsModalProps {
    onClose: () => void;
    showKeyboard: boolean;
    setShowKeyboard: (show: boolean) => void;
}

export default function SettingsModal({ onClose, showKeyboard, setShowKeyboard }: SettingsModalProps) {
    const { theme } = useTheme();

    // Theme-based styles
    const isDark = theme === 'dark';
    const modalBg = isDark ? '#181a20' : '#fff';
    const sidebarBg = isDark ? '#23262f' : '#fafbfc';
    const borderColor = isDark ? '#23262f' : '#eee';
    const textColor = isDark ? '#f3f4f6' : '#222';
    const labelColor = isDark ? '#e5e7eb' : '#374151';
    const buttonBg = isDark ? '#23262f' : '#e5e7eb';
    const buttonColor = isDark ? '#f3f4f6' : '#222';

    const handleToggleKeyboard = () => {
        const newState = !showKeyboard;
        if (typeof window !== 'undefined') {
            localStorage.setItem('keyboard-visibility', newState ? 'visible' : 'hidden');
        }
        setShowKeyboard(newState);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{
                background: modalBg,
                color: textColor,
                borderRadius: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                width: 700,
                maxWidth: '95vw',
                minHeight: 420,
                display: 'flex',
                position: 'relative',
            }}>
                {/* Sidebar */}
                <div style={{
                    width: 180,
                    borderRight: `1px solid ${borderColor}`,
                    padding: '32px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    background: sidebarBg,
                    borderTopLeftRadius: 20,
                    borderBottomLeftRadius: 20,
                }}>
                    <button style={{
                        background: buttonBg,
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontWeight: 700,
                        color: buttonColor,
                        margin: '0 16px',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        outline: 'none',
                    }}>General</button>
                </div>
                {/* Content */}
                <div style={{ flex: 1, padding: '40px 48px', minWidth: 0 }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 32, color: textColor }}>Settings</h2>
                    <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: labelColor }}>Theme</span>
                        <ThemeToggle />
                    </div>
                    <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: labelColor }}>Show On-Screen Keyboard</span>
                        <KeyboardToggle isKeyboardVisible={showKeyboard} onToggle={handleToggleKeyboard} />
                    </div>
                </div>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 18,
                        right: 18,
                        background: 'none',
                        border: 'none',
                        fontSize: 28,
                        fontWeight: 700,
                        color: isDark ? '#aaa' : '#888',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                    }}
                    aria-label="Close settings"
                >
                    ×
                </button>
            </div>
        </div>
    );
} 
