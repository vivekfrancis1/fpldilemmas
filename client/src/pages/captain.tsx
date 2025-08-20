import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../components/header";
import Footer from "../components/footer";
import CaptainSelector from "@/components/captain-selector";
import { BootstrapData } from "@shared/schema";

export default function Captain() {
  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ['/api/bootstrap-static'],
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
            <p className="text-gray-600">Unable to fetch FPL data. Please try again later.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
            Captain & Vice-Captain Selector
          </h1>
          <p className="text-gray-600" data-testid="text-page-description">
            Find the best captain picks based on form, fixtures, and ownership for maximum points
          </p>
        </div>
        
        <CaptainSelector data={bootstrapData} isLoading={isLoading} />
      </main>
      <Footer />
    </div>
  );
}