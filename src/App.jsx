import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';

const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/admin" element={(
          <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Завантаження...</div>}>
            <AdminPage />
          </Suspense>
        )} />
      </Routes>
    </Router>
  );
}

export default App;
