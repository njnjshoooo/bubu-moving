
import React, { useState, useEffect } from 'react';
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

function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [estimationData, setEstimationData] = useState<EstimationData | null>(null);
  const [contactNote, setContactNote] = useState<string>('');

  // 處理 hash change 以支援瀏覽器上一頁/下一頁的基本行為 (選用)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#services-page') {
        setCurrentPage('services');
      } else if (hash === '#supplies-page') {
        setCurrentPage('supplies');
      } else if (hash === '#cases-page') {
        setCurrentPage('cases');
      } else {
        // 如果是 #contact, #hero 等等，通常是首頁的錨點
        setCurrentPage('home');
      }
    };
    
    // Init check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
    if (page === 'services') {
      if (window.location.hash !== '#services-value-added') {
          window.location.hash = 'services-page';
      }
    } else if (page === 'supplies') {
      window.location.hash = 'supplies-page';
    } else if (page === 'cases') {
      window.location.hash = 'cases-page';
    } else {
      // window.location.hash = ''; 
    }
  };

  const handleOrderSupplies = (orderSummary: string) => {
    setContactNote(orderSummary);
    navigateTo('home');
    setTimeout(() => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
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

export default App;
