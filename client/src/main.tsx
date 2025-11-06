import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// Add error boundary for production debugging
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found");
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Error: Root element not found</div>';
} else {
  try {
    createRoot(rootElement).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
  } catch (error) {
    console.error("Failed to render app:", error);
    rootElement.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading application. Please refresh the page.</div>';
  }
}
