import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import Header from "./header";
import Footer from "./footer";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const originalOverflow = useRef<string>("");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Enhanced mobile navigation - close sidebar on all route changes
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [location, isMobile]);

  // Improved body scroll lock management
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      // Store the original overflow value before changing it
      originalOverflow.current = document.body.style.overflow || "";
      document.body.style.overflow = 'hidden';
    } else {
      // Restore the original overflow value
      document.body.style.overflow = originalOverflow.current;
    }
    
    return () => {
      // Cleanup: restore original overflow on unmount
      document.body.style.overflow = originalOverflow.current;
    };
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="min-h-screen bg-fpl-light flex overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col min-w-0 w-full lg:ml-0">
        <Header onSidebarToggle={toggleSidebar} />
        
        <main className="flex-1 px-2 sm:px-3 md:px-4 lg:px-8 xl:px-12 pt-2 sm:pt-4 lg:pt-6 min-w-0 pb-4 sm:pb-6 lg:pb-8 mobile-no-overflow">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}