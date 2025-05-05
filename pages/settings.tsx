import { useRouter } from 'next/router';
import SettingsModal from '@/components/SettingsModal';

export default function SettingsPage() {
    const router = useRouter();
    return <SettingsModal onClose={() => router.push('/')} />;
} 
