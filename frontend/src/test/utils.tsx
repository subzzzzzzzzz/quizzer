import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/slices/authSlice';
import themeReducer from '../store/slices/themeSlice';
import { api } from '../services/api';

export function setupTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(api.middleware),
    preloadedState,
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: any;
  store?: ReturnType<typeof setupTestStore>;
  route?: string;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = setupTestStore(preloadedState),
    route = '/',
    initialEntries = [route],
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): React.JSX.Element {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
