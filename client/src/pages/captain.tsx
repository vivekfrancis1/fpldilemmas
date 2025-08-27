import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import CaptainSelector from "@/components/captain-selector";
import { BootstrapData } from "@shared/schema";

export default function Captain() {
  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ['/api/bootstrap-static'],
  });

  if (error) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          <div className="fpl-error">
            <h1 className="fpl-error-title">Error Loading Data</h1>
            <p className="fpl-error-message">Unable to fetch FPL data. Please try again later.</p>
            <button className="fpl-error-button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Crown className="h-8 w-8" />
              <h1>Captain Selector</h1>
            </div>
            <p className="fpl-page-subtitle">
              Enhanced with historical captaincy data (2016-2024) and advanced statistical modeling for optimal captain selection
            </p>
          </div>
        </div>
        
        <CaptainSelector data={bootstrapData} isLoading={isLoading} />
      </div>
    </div>
  );
}