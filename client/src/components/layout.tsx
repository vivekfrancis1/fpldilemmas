import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import Footer from "./footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-fpl-light flex overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header onSidebarToggle={toggleSidebar} />
        
        <main className="flex-1 lg:pl-8 xl:pl-12 px-3 sm:px-4 lg:pr-6 xl:pr-8 pt-2 sm:pt-4 lg:pt-6 min-w-0 overflow-x-hidden pb-4 sm:pb-6 lg:pb-8">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}