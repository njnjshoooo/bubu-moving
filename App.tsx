import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminRoute, ProtectedRoute, ConsultantRoute, SuperAdminRoute } from './components/ProtectedRoute';

// Public pages
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Services from './components/Services';
import Process from './components/Process';
import Estimation from './components/Estimation';
import Testimonials from './components/Testimonials';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import ServicesPage from './components/ServicesPage';
import SuppliesPage from './components/SuppliesPage';
import About from './components/About';
import CaseStudyPage from './components/CaseStudyPage';
import BookingCalendar from './components/BookingCalendar';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminBookings from './pages/admin/AdminBookings';
import AdminQuoteList from './pages/admin/AdminQuoteList';
import QuoteBuilder from './pages/admin/QuoteBuilder';
import QuoteView from './pages/admin/QuoteView';

// Member pages
import MemberLayout from './pages/member/MemberLayout';
import MemberDashboard from './pages/member/MemberDashboard';
import MemberBookings from './pages/member/MemberBookings';
import MemberProfile from './pages/member/MemberProfile';

// Consultant pages
import ConsultantLayout from './pages/consultant/ConsultantLayout';
import ConsultantSchedule from './pages/consultant/ConsultantSchedule';
import ConsultantProfile from './pages/consultant/ConsultantProfile';

// Admin extra pages
import AdminConsultants from './pages/admin/AdminConsultants';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCaseStudies from './pages/admin/AdminCaseStudies';

// Member extra pages
import MemberQuotes from './pages/member/MemberQuotes';
import MemberQuoteView from './pages/member/MemberQuoteView';
import MemberEstimates from './pages/member/MemberEstimates';

// Consultant extra pages
import ConsultantDashboard from './pages/consultant/ConsultantDashboard';

export interface EstimationData {
  area: number;
  roomType: string;
  moveType: string;
  enterpriseItemType?: string;
  elevatorStatus: string;
  trucks: number;
  people: number;
  estimatedHours: number;
  truckCost: number;
  laborCost: number;
  supplyCost: number;
  totalCost: number;
}

export type PageView = 'home' | 'services' | 'supplies' | 'cases';

// ─── Public Layout ─────────────────────────────────────────────────────────────
function PublicLayout() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [estimationData, setEstimationData] = useState<EstimationData | null>(null);
  const [contactNote, setContactNote] = useState<string>('');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/') return; // React Router hash, ignore
      if (hash.includes('services-page')) setCurrentPage('services');
      else if (hash.includes('supplies-page')) setCurrentPage('supplies');
      else if (hash.includes('cases-page')) setCurrentPage('cases');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleOrderSupplies = (orderSummary: string) => {
    setContactNote(orderSummary);
    navigateTo('home');
    setTimeout(() => {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage={currentPage} onNavigate={navigateTo} />
      <main>
        {currentPage === 'home' ? (
          <>
            <Hero />
            <Features onReadMore={() => navigateTo('services')} />
            <About />
            <Services />
            <Estimation onEstimate={setEstimationData} />
            <BookingCalendar />
            <Process />
            <Testimonials />
            <ContactForm prefilledData={estimationData} initialNote={contactNote} />
          </>
        ) : currentPage === 'services' ? (
          <ServicesPage onNavigateHome={() => navigateTo('home')} />
        ) : currentPage === 'cases' ? (
          <CaseStudyPage onNavigateHome={() => navigateTo('home')} />
        ) : (
          <SuppliesPage onOrder={handleOrderSupplies} />
        )}
      </main>
      <Footer />
    </div>
  );
}

// ─── App with Router ────────────────────────────────────────────────────────────
function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicLayout />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="quotes" element={<AdminQuoteList />} />
            <Route path="quotes/new" element={<QuoteBuilder />} />
            <Route path="quotes/new/:bookingId" element={<QuoteBuilder />} />
            <Route path="quotes/:quoteId" element={<QuoteBuilder />} />
            <Route path="quotes/:quoteId/view" element={<QuoteView />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="cases" element={<AdminCaseStudies />} />
            <Route path="consultants" element={<AdminConsultants />} />
            <Route path="users" element={<SuperAdminRoute><AdminUsers /></SuperAdminRoute>} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Consultant */}
          <Route path="/consultant" element={<ConsultantRoute><ConsultantLayout /></ConsultantRoute>}>
            <Route index element={<ConsultantSchedule />} />
            <Route path="dashboard" element={<ConsultantDashboard />} />
            <Route path="profile" element={<ConsultantProfile />} />
          </Route>

          {/* Member */}
          <Route path="/member" element={<ProtectedRoute><MemberLayout /></ProtectedRoute>}>
            <Route index element={<MemberDashboard />} />
            <Route path="bookings" element={<MemberBookings />} />
            <Route path="quotes" element={<MemberQuotes />} />
            <Route path="quotes/:quoteId" element={<MemberQuoteView />} />
            <Route path="estimates" element={<MemberEstimates />} />
            <Route path="profile" element={<MemberProfile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
