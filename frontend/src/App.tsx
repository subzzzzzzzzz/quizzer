import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store';
import type { RootState } from './store';
import AppRouter from './routes';
import { useGetMeQuery } from './services/api';
import { setCredentials, setInitialized } from './store/slices/authSlice';
import Spinner from './components/atoms/Spinner/Spinner';

// Sub-bootstrap component to hook into RTK Query and dispatchers
const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const { isDark } = useSelector((state: RootState) => state.theme);
  const { isInitialized } = useSelector((state: RootState) => state.auth);

  // Fetch current session details on page refresh
  const { data: meResponse, error, isLoading } = useGetMeQuery();

  useEffect(() => {
    if (meResponse?.success && meResponse.data) {
      dispatch(setCredentials(meResponse.data));
    } else if (error) {
      dispatch(setInitialized());
    }
  }, [meResponse, error, dispatch]);

  // Handle body theme class styling on boot
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  if (isLoading && !isInitialized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <Spinner size="large" />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Synchronizing secure session...</span>
      </div>
    );
  }

  return <AppRouter />;
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
};

export default App;
