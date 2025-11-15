import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Profile } from './pages/Profile';
import { CreateSuit } from './pages/CreateSuit';
import { Notifications } from './pages/Notifications';
import { Communities } from './pages/Communities';
import { CreateCommunity } from './pages/CreateCommunity';
import { CommunityDetails } from './pages/CommunityDetails';
import { SuitDetails } from './pages/SuitDetails';

function App() {
  useEffect(() => {
    console.log('🚀 [App] Application initialized');
    console.log('🔍 [App] Current URL:', window.location.href);
    console.log('🔍 [App] Origin:', window.location.origin);
    console.log('🔍 [App] Hash:', window.location.hash);
    console.log('🔍 [App] Search params:', window.location.search);
    
    // Check if this is a redirect from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has('code');
    const hasState = urlParams.has('state');
    const hasError = urlParams.has('error');
    
    if (hasCode || hasState || hasError) {
      console.log('🔍 [App] OAuth redirect detected!');
      console.log('  - Has code:', hasCode);
      console.log('  - Has state:', hasState);
      console.log('  - Has error:', hasError);
      if (hasError) {
        console.error('❌ [App] OAuth error:', urlParams.get('error'));
        console.error('❌ [App] OAuth error description:', urlParams.get('error_description'));
      }
      if (hasCode) {
        console.log('✅ [App] OAuth code received:', urlParams.get('code')?.substring(0, 20) + '...');
      }
      if (hasState) {
        console.log('✅ [App] OAuth state received:', urlParams.get('state'));
      }
    }

    // Log environment variables
    console.log('🔍 [App] Environment check:');
    console.log('  - VITE_ENOKI_API_KEY:', import.meta.env.VITE_ENOKI_API_KEY ? 'Set' : 'Not set');
    console.log('  - VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
    
    // Listen for storage events (might be used by Enoki)
    const handleStorageChange = (e: StorageEvent) => {
      console.log('🔍 [App] Storage changed:', {
        key: e.key,
        oldValue: e.oldValue?.substring(0, 50),
        newValue: e.newValue?.substring(0, 50),
      });
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/create" element={<CreateSuit />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/create" element={<CreateCommunity />} />
          <Route path="/communities/:id" element={<CommunityDetails />} />
          <Route path="/suit/:id" element={<SuitDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
