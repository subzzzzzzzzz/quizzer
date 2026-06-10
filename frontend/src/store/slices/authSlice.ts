import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'candidate';
  status: 'active' | 'inactive';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    logoutUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    setInitialized(state) {
      state.isInitialized = true;
    },
  },
});

export const { setCredentials, logoutUser, setInitialized } = authSlice.actions;
export default authSlice.reducer;
