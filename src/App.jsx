import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './components/shop/Home';
import BlogPost from './components/shop/BlogPost';
import CartDrawer from './components/shop/CartDrawer';
import AdminPanel from './components/admin/AdminPanel';
import TopBanner from './components/shop/TopBanner';

function App() {
  return (
    <HelmetProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col font-sans text-secondary-brown">
            <TopBanner />
            <Navbar />
            <CartDrawer />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </HelmetProvider>
  );
}

export default App;
