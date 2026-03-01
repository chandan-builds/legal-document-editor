'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const cycle = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    const icon = theme === 'light'
        ? <Sun size={16} />
        : theme === 'dark'
            ? <Moon size={16} />
            : <Monitor size={16} />;

    const label = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';

    return (
        <button
            onClick={cycle}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            title={`Theme: ${label}. Click to cycle.`}
            aria-label={`Current theme: ${label}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
