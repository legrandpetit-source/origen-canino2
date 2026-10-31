import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './components/shop/Home';
import BlogPost from './components/shop/BlogPost';
import CartDrawer from './components/shop/CartDrawer';
import AdminPanel from './components/admin/AdminPanel';
import TopBanner from './components/shop/TopBanner';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <CartProvider>
          <Router>
            <Routes>
              {/* Rutas del E-commerce (Shop) */}
              <Route path="/" element={
                <div className="min-h-screen flex flex-col font-sans text-secondary-brown">
                  <TopBanner />
                  <Navbar />
                  <CartDrawer />
                  <main className="flex-grow">
                    <Outlet />
                  </main>
                  <Footer />
                </div>
              }>
                <Route index element={<Home />} />
                <Route path="blog/:slug" element={<BlogPost />} />
                <Route path="admin" element={<AdminPanel />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CartProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
