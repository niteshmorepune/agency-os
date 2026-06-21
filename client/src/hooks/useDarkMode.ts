import { useEffect } from 'react';

export function useDarkMode() {
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored !== null ? stored === 'true' : prefersDark;
    document.documentElement.classList.toggle('dark', isDark);
  }, []);
}

export function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', String(isDark));
  return isDark;
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}
