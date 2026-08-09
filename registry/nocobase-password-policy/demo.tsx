import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PasswordPolicyManager } from "./password-policy-manager";

export default function PasswordPolicyDemoPage() {
  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary"><ShieldCheck /> Security</Badge>
          <Badge variant="outline">System settings</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Password policy</h1>
        <p className="max-w-3xl text-muted-foreground">
          Configure password rules, expiry notifications, sign-in lockout, and locked users from one administration workspace.
        </p>
      </header>
      <section className="min-h-[38rem] [&_[data-slot=card]]:min-h-[30rem]"><PasswordPolicyManager /></section>
    </div>
  );
}
