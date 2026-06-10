import { describe, it, expect, beforeEach, vi } from 'vitest';
import themeReducer, { toggleTheme, setTheme } from './themeSlice';

describe('themeSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    vi.restoreAllMocks();
  });

  it('should handle toggleTheme', () => {
    const state = { isDark: false };
    const nextState = themeReducer(state, toggleTheme());
    
    expect(nextState.isDark).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);

    const backState = themeReducer(nextState, toggleTheme());
    expect(backState.isDark).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('should handle setTheme', () => {
    const state = { isDark: false };
    const nextState = themeReducer(state, setTheme(true));
    
    expect(nextState.isDark).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);

    const thirdState = themeReducer(nextState, setTheme(false));
    expect(thirdState.isDark).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });
});
