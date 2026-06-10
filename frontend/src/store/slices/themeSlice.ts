import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  isDark: boolean;
}

const getInitialTheme = (): boolean => {
  const saved = localStorage.getItem('theme');
  if (saved) {
    return saved === 'dark';
  }
  // Check browser preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const initialState: ThemeState = {
  isDark: getInitialTheme(),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.isDark = !state.isDark;
      localStorage.setItem('theme', state.isDark ? 'dark' : 'light');
      
      // Update body class
      if (state.isDark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    },
    setTheme(state, action: PayloadAction<boolean>) {
      state.isDark = action.payload;
      localStorage.setItem('theme', state.isDark ? 'dark' : 'light');
      if (state.isDark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
