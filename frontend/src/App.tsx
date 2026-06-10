import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store';
import type { RootState } from './store';
import AppRouter from './routes';
import { useGetMeQuery } from './services/api';
import { setCredentials, setInitialized } from './store/slices/authSlice';
import { ConfigProvider, theme, Spin } from 'antd';

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
        <Spin size="large" />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Synchronizing secure session...</span>
      </div>
    );
  }

  // Ant Design custom theme tokens mapping var colors from index.css
  const customTheme = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#534AB7', // primary2 purple
      colorSuccess: '#1D9E75', // secondary2 teal
      colorWarning: '#BA7517', // tertiary2 amber
      colorError: '#E24B4A',   // danger2 red
      colorBgBase: isDark ? '#141416' : '#FFFFFF', // neutral0 background
      colorTextBase: isDark ? '#F5F4F0' : '#1A1A18', // neutral9 text
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      borderRadius: 6,
    },
  };

  return (
    <ConfigProvider theme={customTheme}>
      <AppRouter />
    </ConfigProvider>
  );
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
