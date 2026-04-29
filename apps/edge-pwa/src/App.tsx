import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HandoffProvider } from './context/HandoffContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import VerifyPage from './pages/VerifyPage';
import HistoryPage from './pages/HistoryPage';
import DocumentationPage from './pages/DocumentationPage';
import AboutPage from './pages/AboutPage';
import './index.css';

export default function App() {
  return (
    <HandoffProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/"        element={<LandingPage />} />
              <Route path="/verify"  element={<VerifyPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/docs"    element={<DocumentationPage />} />
              <Route path="/about"   element={<AboutPage />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </HandoffProvider>
  );
}
