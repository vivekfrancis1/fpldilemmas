import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const SCRIPT_ID = "bmc-widget-script";

// Loads the Buy Me a Coffee widget only when enabled via admin config
// (GET /api/bmc-widget-config). Currently defaults to off; an admin can
// re-enable it later from the Site Settings admin page without a redeploy.
export default function BmcWidget() {
  const { data } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/bmc-widget-config"],
  });

  useEffect(() => {
    if (!data?.enabled) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.setAttribute("data-name", "BMC-Widget");
    script.setAttribute("data-cfasync", "false");
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.setAttribute("data-id", "fpldilemmas");
    script.setAttribute("data-description", "Support me on Buy me a coffee!");
    script.setAttribute(
      "data-message",
      "Thank you for supporting my work. Excited to continue contributing to the FPL community. "
    );
    script.setAttribute("data-color", "#5F7FFF");
    script.setAttribute("data-position", "Right");
    script.setAttribute("data-x_margin", "18");
    script.setAttribute("data-y_margin", "18");
    document.body.appendChild(script);

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
      document.querySelector('div[id^="bmc-wbtn"]')?.remove();
      document.getElementById("bmc-iframe")?.remove();
    };
  }, [data?.enabled]);

  return null;
}
