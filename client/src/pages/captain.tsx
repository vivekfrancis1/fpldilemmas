import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Crown } from "lucide-react";
import CaptainSelector from "@/components/captain-selector";
import { BootstrapData } from "@shared/schema";

export default function Captain() {
  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ['/api/bootstrap-static'],
  });

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
              <p className="text-gray-600">Unable to fetch FPL data. Please try again later.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50/30">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <Crown className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4" data-testid="text-page-title">
              Captain Selector
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed" data-testid="text-page-description">
              Find the best captain picks based on form, fixtures, and ownership for maximum points
            </p>
          </div>
          
          <CaptainSelector data={bootstrapData} isLoading={isLoading} />
        </div>
      </div>
    </Layout>
  );
}