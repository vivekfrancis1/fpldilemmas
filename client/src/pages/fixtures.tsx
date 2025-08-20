import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Calendar } from "lucide-react";
import FixtureAnalyzer from "@/components/fixture-analyzer";
import { BootstrapData } from "@shared/schema";

export default function Fixtures() {
  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8" data-testid="error-state">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full mr-3">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load data</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API. Please check your connection and try again.</p>
                  <button 
                    className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    onClick={() => window.location.reload()}
                    data-testid="button-retry"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50/30">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4" data-testid="text-page-title">
              Fixture Analyzer
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed" data-testid="text-page-description">
              Analyze upcoming fixtures and their difficulty ratings to plan your transfers and captaincy
            </p>
          </div>

          <FixtureAnalyzer 
            data={bootstrapData}
            isLoading={isLoading}
          />
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
            <div className="bg-white rounded-lg p-6 sm:p-8 flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600"></div>
              <span className="text-gray-700 font-medium text-sm sm:text-base">Loading fixture data...</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}