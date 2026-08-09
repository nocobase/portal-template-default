import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DepartmentsManager } from "./departments-manager";

export default function DepartmentsDemoPage() {
  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary"><Building2 /> Organization</Badge>
          <Badge variant="outline">Departments and members</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Department administration</h1>
        <p className="max-w-3xl text-muted-foreground">
          Maintain the hierarchy, memberships, and department owners. The public adapter also covers main-department and role assignments.
        </p>
      </header>
      <section className="min-h-[40rem] [&>div]:min-h-[38rem] [&>div>div]:min-h-[38rem]"><DepartmentsManager /></section>
    </div>
  );
}
