import { useRouter } from 'next/router';
import SettingsModal from '@/components/SettingsModal';
import { useState } from 'react';

export default function SettingsPage() {
    const router = useRouter();
    const [showKeyboard, setShowKeyboard] = useState(true);
    return <SettingsModal onClose={() => router.push('/')} showKeyboard={showKeyboard} setShowKeyboard={setShowKeyboard} />;
} 
