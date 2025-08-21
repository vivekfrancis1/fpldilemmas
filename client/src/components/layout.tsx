import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { ProfileHeader } from "./profile-header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Profile Header */}
          <ProfileHeader />
          
          {/* Page content */}
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile sidebar overlay - can be added later */}
    </div>
  );
}