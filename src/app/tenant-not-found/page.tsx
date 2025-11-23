export default function TenantNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tenant Not Found
        </h1>
        <p className="text-gray-600">
          The subdomain you're trying to access doesn't exist.
        </p>
      </div>
    </div>
  );
}
