import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TenantRegistrationForm } from "@/modules/tenant/components/TenantRegistrationForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md rounded-lg border border-slate-200 shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#1E3A5F]">
            Create Your Workspace
          </CardTitle>
          <CardDescription className="text-slate-600">
            Start managing your publishing business with Salina ERP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantRegistrationForm />

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-[#1E3A5F] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
