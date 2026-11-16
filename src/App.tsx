/**
 * Infanta National High School
 * Official School Website & Academic Management Portal
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { AdmissionsSection } from './components/AdmissionsSection';
import { JuniorHighSection } from './components/JuniorHighSection';
import { SeniorHighSection } from './components/SeniorHighSection';
import { StudentLifeSection } from './components/StudentLifeSection';
import { SchoolUpdatesSection } from './components/SchoolUpdatesSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { PortalModal } from './components/portal/PortalModal';
import { EnrollmentPortalModal } from './components/portal/EnrollmentPortalModal';
import { Role, EnrollmentSettings } from './types/school';
import { GraduationCap, ArrowRight, FileCheck2, Lock } from 'lucide-react';
import { schoolDb } from './services/schoolDatabase';

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalRole, setPortalRole] = useState<Role>('student_parent');
  const [enrollmentPortalOpen, setEnrollmentPortalOpen] = useState(false);
  const [enrollmentTab, setEnrollmentTab] = useState<'enroll' | 'status' | 'guidelines'>('enroll');
  const [enrollmentSettings, setEnrollmentSettings] = useState<EnrollmentSettings>(() =>
    schoolDb.getEnrollmentSettings()
  );

  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  React.useEffect(() => {
    const sync = () => setEnrollmentSettings(schoolDb.getEnrollmentSettings());
    sync();
    const unsub = schoolDb.subscribe(sync);
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      const headerEl = document.querySelector('header');
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 185;
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = Math.max(0, elementPosition - headerHeight - 16);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset < 120) {
        setActiveSection('home');
        return;
      }
      const sectionIds = ['updates', 'student-life', 'junior-high', 'senior-high', 'admissions', 'about', 'contact'];
      const headerEl = document.querySelector('header');
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 185;
      const triggerY = window.pageYOffset + headerHeight + 20;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const sec = document.getElementById(sectionIds[i]);
        if (sec) {
          const top = sec.getBoundingClientRect().top + window.pageYOffset;
          if (triggerY >= top) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenPortal = (role: Role = 'student_parent') => {
    setPortalRole(role);
    setPortalOpen(true);
  };

  const handleOpenEnrollmentPortal = (tab: 'enroll' | 'status' | 'guidelines' = 'enroll') => {
    setEnrollmentTab(tab);
    setEnrollmentPortalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Sticky Header with School Logo Placeholder & Identity */}
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenPortal={handleOpenPortal}
        onOpenEnrollmentPortal={handleOpenEnrollmentPortal}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 1. Hero Section with Campus Facade & Mission (Home) */}
        <HeroSection
          onNavigate={handleNavigate}
          onOpenPortal={handleOpenPortal}
          onOpenEnrollmentPortal={handleOpenEnrollmentPortal}
        />

        {/* 2. School Updates & Activities Bulletin (Updates & Calendar) */}
        <SchoolUpdatesSection />

        {/* 3. Student Life & Organizations (Student Life) */}
        <StudentLifeSection />

        {/* 4. Junior High School (Grades 7 to 10 + STE) */}
        <JuniorHighSection onNavigateToEnroll={() => handleOpenEnrollmentPortal('enroll')} />

        {/* 5. Senior High School (Academic & TVL Strands + Labs) */}
        <SeniorHighSection onNavigateToEnroll={() => handleOpenEnrollmentPortal('enroll')} />

        {/* 6. Admissions & Online Enrollment Guide (Admissions & Enrollment) */}
        <AdmissionsSection 
          onOpenPortal={handleOpenPortal}
          onOpenEnrollmentPortal={handleOpenEnrollmentPortal}
        />

        {/* 7. About Infanta National High School (About INHS) */}
        <AboutSection />

        {/* 8. Contact & Public Assistance Desk (Contact us) */}
        <ContactSection />
      </main>

      {/* Official DepEd Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenPortal={handleOpenPortal}
        onOpenEnrollmentPortal={handleOpenEnrollmentPortal}
      />

      {/* Interactive Academic Portal Modal (Faculty, Admin, Students) */}
      <PortalModal
        isOpen={portalOpen}
        onClose={() => setPortalOpen(false)}
        initialRole={portalRole}
      />

      {/* Dedicated Standalone Online Enrollment Portal Modal */}
      <EnrollmentPortalModal
        isOpen={enrollmentPortalOpen}
        onClose={() => setEnrollmentPortalOpen(false)}
        initialTab={enrollmentTab}
      />

      {/* Persistent Floating Quick Launchers */}
      <aside aria-label="Portal Quick Launchers" className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-30 no-print flex flex-col items-end gap-2.5">
        <button
          onClick={() => handleOpenEnrollmentPortal('enroll')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-white rounded-full shadow-lg hover:shadow-xl border transition-all duration-200 cursor-pointer group ${
            enrollmentSettings.isOpen
              ? 'bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 border-emerald-400/40'
              : 'bg-rose-800 hover:bg-rose-700 active:bg-rose-900 border-rose-400/40'
          }`}
          title="Open Dedicated Online Enrollment Portal"
        >
          {enrollmentSettings.isOpen ? (
            <FileCheck2 className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
          ) : (
            <Lock className="w-4 h-4 text-rose-200 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-xs font-bold tracking-wide">
            {enrollmentSettings.isOpen ? 'Enroll Online' : 'Enrollment Closed'}
          </span>
          <span
            className={`hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
              enrollmentSettings.isOpen
                ? 'bg-emerald-950 text-emerald-300'
                : 'bg-rose-950 text-rose-200'
            }`}
          >
            {enrollmentSettings.isOpen ? enrollmentSettings.schoolYear : 'HALTED'}
          </span>
        </button>

        <button
          onClick={() => handleOpenPortal('student_parent')}
          className="flex items-center gap-2.5 px-4 py-3 bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white rounded-full shadow-xl hover:shadow-2xl border border-amber-400/30 transition-all duration-200 cursor-pointer group"
          title="Open Infanta NHS Portal (Faculty / Admin / Students)"
        >
          <GraduationCap className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold tracking-wide hidden sm:inline">
            INHS Portal Access
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-300 hidden sm:inline group-hover:translate-x-0.5 transition-transform" />
        </button>
      </aside>
    </div>
  );
}
