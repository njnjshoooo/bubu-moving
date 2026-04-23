import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import Footer from './components/Footer';
import BookingPage from './components/BookingPage';
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
import SettlementSheet from './pages/admin/SettlementSheet';

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

export type PageView = 'home' | 'services' | 'supplies' | 'cases' | 'book';

// ─── Public Layout ─────────────────────────────────────────────────────────────
function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setEstimationData] = useState<EstimationData | null>(null);

  // URL 是唯一 source of truth，讓每頁都能被 Google 個別索引
  const currentPage: PageView =
    location.pathname.startsWith('/services') ? 'services' :
    location.pathname.startsWith('/supplies') ? 'supplies' :
    location.pathname.startsWith('/cases')    ? 'cases'    :
    location.pathname.startsWith('/book')     ? 'book'     :
    'home';

  const navigateTo = (page: PageView) => {
    const path = page === 'home' ? '/' : `/${page}`;
    if (location.pathname !== path) navigate(path);
    window.scrollTo(0, 0);
  };

  const handleOrderSupplies = (orderSummary: string) => {
    // 把訂購摘要暫存到 sessionStorage，BookingCalendar 的 notes 可以預填
    sessionStorage.setItem('booking_prefill_note', orderSummary);
    navigateTo('home');
    setTimeout(() => {
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
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
            <Process />
            <Testimonials />
            <BookingCalendar />
          </>
        ) : currentPage === 'services' ? (
          <ServicesPage onNavigateHome={() => navigateTo('home')} />
        ) : currentPage === 'cases' ? (
          <CaseStudyPage onNavigateHome={() => navigateTo('home')} />
        ) : currentPage === 'book' ? (
          <BookingPage />
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
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicLayout />} />
          <Route path="/services" element={<PublicLayout />} />
          <Route path="/supplies" element={<PublicLayout />} />
          <Route path="/cases" element={<PublicLayout />} />
          <Route path="/book" element={<PublicLayout />} />
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
            <Route path="settlement/:quoteId" element={<SettlementSheet />} />
            <Route path="consultants" element={<AdminConsultants />} />
            <Route path="users" element={<SuperAdminRoute><AdminUsers /></SuperAdminRoute>} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Consultant */}
          <Route path="/consultant" element={<ConsultantRoute><ConsultantLayout /></ConsultantRoute>}>
            <Route index element={<ConsultantSchedule />} />
            <Route path="dashboard" element={<ConsultantDashboard />} />
            <Route path="profile" element={<ConsultantProfile />} />
            {/* 顧問也能使用的管理功能（reuse 後台頁面，內部依 role 控制行為）*/}
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="quotes" element={<AdminQuoteList />} />
            <Route path="quotes/new" element={<QuoteBuilder />} />
            <Route path="quotes/new/:bookingId" element={<QuoteBuilder />} />
            <Route path="quotes/:quoteId" element={<QuoteBuilder />} />
            <Route path="quotes/:quoteId/view" element={<QuoteView />} />
            <Route path="settlement/:quoteId" element={<SettlementSheet />} />
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
    </BrowserRouter>
  );
}

export default App;
