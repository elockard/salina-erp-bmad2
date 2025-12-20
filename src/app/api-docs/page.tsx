"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

// Fetch spec from API route to avoid build-time file reading
const SPEC_URL = "/api/openapi.yaml";

export default function ApiDocsPage() {
  return (
    <div className="h-screen">
      <ApiReferenceReact
        configuration={{
          url: SPEC_URL,
          theme: "purple",
          darkMode: true,
          hideModels: false,
          showSidebar: true,
          authentication: {
            preferredSecurityScheme: "bearerAuth",
          },
        }}
      />
    </div>
  );
}
