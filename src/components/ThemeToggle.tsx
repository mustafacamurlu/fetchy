import { Sun, Moon } from 'lucide-react';
import { usePreferencesStore } from '../store/preferencesStore';
import { useEffect } from 'react';

export default function ThemeToggle() {
  const { preferences, savePreferences } = usePreferencesStore();
  const isDark = preferences.theme === 'dark';

  useEffect(() => {
    // Apply theme to body element
    if (preferences.theme === 'light') {
      document.body.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
    }
  }, [preferences.theme]);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    savePreferences({ theme: newTheme });
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded transition-colors hover:bg-aki-border text-aki-text-muted hover:text-aki-text"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

