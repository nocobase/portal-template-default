import {
  AIChatWindow,
  AIEmployeeShortcut,
  ChatInline,
  useAIPageElement,
} from "../components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AIChatProvider,
  AIPageContextScope,
  useAI,
  useAIChatController,
  type AIEmployeeTask,
  type AIEmployeeTasks,
  type AIWorkContextItem,
} from "../providers";
import { useMemo, useState, type ReactNode } from "react";
import { AIConfigurationGate, AIConversationModeToggle } from "./mode-toggle";
import { PageElementShowcase } from "./page-element-showcase";

const isBusinessEmployee = (employee: { username: string }) =>
  !["nathan", "dara"].includes(employee.username.toLowerCase());

export function PageContextPage() {
  return (
    <AIConfigurationGate>
      <PageContextPageContent />
    </AIConfigurationGate>
  );
}

function PageContextPageContent() {
  return (
    <div className="space-y-12 pb-12">
      <section className="flex flex-wrap items-start justify-between gap-5 border-b pb-8">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">AI Components</Badge>
            <Badge variant="outline">Conversation context</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em]">
            Page context
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Users can pick context manually while composing. Configured tasks
            then follow two rules: a task can explicitly select a context, or a
            task without context can inherit the context surrounding its
            Shortcut or conversation.
          </p>
        </div>
        <AIConversationModeToggle />
      </section>

      <ContextSection
        eyebrow="Manual context"
        title="Pick page context while composing a message"
        description="The user can pick any registered page element from the composer. Its current content is added to this message without changing task configuration."
      >
        <PageElementShowcase />
      </ContextSection>

      <ContextSection
        eyebrow="Scenario 1 · Shortcut task context"
        title="Configure a Shortcut task to use one page context"
        description="The Shortcut task stores a page-element reference in message.workContext and reads its latest content when the user starts the task."
      >
        <ShortcutTaskContextShowcase />
      </ContextSection>

      <ContextSection
        eyebrow="Scenario 2 · Conversation preset task context"
        title="Configure a conversation preset task to use one page context"
        description="The AIChatProvider employeeTasks configuration uses the same message.workContext reference, but exposes the task in the conversation empty state instead of through a Shortcut."
      >
        <PresetTaskContextShowcase />
      </ContextSection>

      <ContextSection
        eyebrow="Scenario 3 · Inherited context"
        title="Automatically use the surrounding page context"
        description="A Shortcut or AIChatProvider inside AIPageContextScope inherits that context. A task-level message.workContext still takes precedence when configured."
      >
        <InheritedContextShowcase />
      </ContextSection>
    </div>
  );
}

function ShortcutTaskContextShowcase() {
  const { employees } = useAI();
  const employee = employees.filter(isBusinessEmployee)[0]!;
  const controller = useAIChatController();
  const [summary, setSummary] = useState(
    "Payment callback reached the order service twelve minutes late."
  );
  const [severity, setSeverity] = useState("high");
  const contextReference = useMemo<AIWorkContextItem>(
    () => ({
      type: "page-element",
      id: "selected-support-case",
      title: "Selected support case",
    }),
    []
  );
  const contextRef = useAIPageElement({
    id: "selected-support-case",
    title: "Selected support case",
    kind: "form",
    getContext: () => ({
      resource: "supportTickets",
      values: { summary, severity },
    }),
  });

  const shortcutTask = useMemo<AIEmployeeTask>(
    () => ({
      title: "Analyze selected case",
      message: {
        user: "Analyze the selected support case.",
        workContext: [contextReference],
      },
      autoSend: false,
    }),
    [contextReference]
  );
  return (
    <AIChatProvider
      id="shortcut-task-context-demo"
      controller={controller}
      defaultEmployee={employee.username}
    >
      <Card className="gap-0 overflow-hidden py-0">
        <div className="grid min-h-[560px] xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="bg-muted/15 p-4 sm:p-5">
            <Card ref={contextRef}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Selected support case</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Change a value before running either task.
                    </p>
                  </div>
                  <Badge variant="secondary">Task context</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2">
                  <Label htmlFor="selected-context-summary">Summary</Label>
                  <Input
                    id="selected-context-summary"
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={severity}
                    onValueChange={(value) => value && setSeverity(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </CardContent>
            </Card>
            <Card className="mt-5 border-dashed bg-background/80">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Task shortcut area</CardTitle>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This button is outside the selected page element. Its task
                      explicitly references “Selected support case”.
                    </p>
                  </div>
                  <Badge variant="outline">Explicit reference</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <AIEmployeeShortcut
                  aiEmployee={employee.username}
                  target={controller}
                  tasks={[shortcutTask]}
                  label="Analyze selected case"
                  size={34}
                />
              </CardContent>
            </Card>
          </div>

          <div className="min-h-0 border-t bg-card xl:border-l xl:border-t-0">
            <ChatInline className="h-[560px] rounded-none border-0">
              <AIChatWindow showConversationToggle={false} disclaimer={false} />
            </ChatInline>
          </div>
        </div>
      </Card>
    </AIChatProvider>
  );
}

function PresetTaskContextShowcase() {
  const { employees } = useAI();
  const employee = employees.filter(isBusinessEmployee)[0]!;
  const [opportunityName, setOpportunityName] = useState(
    "Enterprise workspace expansion"
  );
  const [forecast, setForecast] = useState("likely");
  const contextReference = useMemo<AIWorkContextItem>(
    () => ({
      type: "page-element",
      id: "selected-opportunity",
      title: "Selected opportunity",
    }),
    []
  );
  const contextRef = useAIPageElement({
    id: "selected-opportunity",
    title: "Selected opportunity",
    kind: "record-detail",
    getContext: () => ({
      resource: "opportunities",
      record: { name: opportunityName, forecast },
    }),
  });
  const presetTask = useMemo<AIEmployeeTask>(
    () => ({
      title: "Prepare opportunity brief",
      message: {
        user: "Prepare a brief for the selected opportunity.",
        workContext: [contextReference],
      },
      autoSend: false,
    }),
    [contextReference]
  );
  const employeeTasks = useMemo<AIEmployeeTasks>(
    () => ({ [employee.username]: [presetTask] }),
    [employee.username, presetTask]
  );

  return (
    <AIChatProvider
      id="preset-task-context-demo"
      defaultEmployee={employee.username}
      employeeTasks={employeeTasks}
    >
      <Card className="gap-0 overflow-hidden py-0">
        <div className="grid min-h-[560px] xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="bg-muted/15 p-4 sm:p-5">
            <Card ref={contextRef}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Selected opportunity</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Change a value, then select the preset task in the chat.
                    </p>
                  </div>
                  <Badge variant="secondary">Preset task context</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2">
                  <Label htmlFor="preset-context-opportunity">
                    Opportunity
                  </Label>
                  <Input
                    id="preset-context-opportunity"
                    value={opportunityName}
                    onChange={(event) => setOpportunityName(event.target.value)}
                  />
                </label>
                <label className="block space-y-2">
                  <Label>Forecast</Label>
                  <Select
                    value={forecast}
                    onValueChange={(value) => value && setForecast(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pipeline">Pipeline</SelectItem>
                      <SelectItem value="likely">Likely</SelectItem>
                      <SelectItem value="committed">Committed</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <div className="rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
                  No Shortcut is used here. “Prepare opportunity brief” comes
                  from AIChatProvider.employeeTasks and appears in the
                  conversation empty state.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="min-h-0 border-t bg-card xl:border-l xl:border-t-0">
            <ChatInline className="h-[560px] rounded-none border-0">
              <AIChatWindow showConversationToggle={false} disclaimer={false} />
            </ChatInline>
          </div>
        </div>
      </Card>
    </AIChatProvider>
  );
}

function InheritedContextShowcase() {
  const { employees } = useAI();
  const employee = employees.filter(isBusinessEmployee)[0]!;
  const controller = useAIChatController();
  const [accountName, setAccountName] = useState("Northwind Finance");
  const [stage, setStage] = useState("negotiation");
  const contextReference = useMemo<AIWorkContextItem>(
    () => ({
      type: "page-element",
      id: "inherited-renewal-context",
      title: "Current account renewal",
    }),
    []
  );
  const contextRef = useAIPageElement({
    id: "inherited-renewal-context",
    title: "Current account renewal",
    kind: "record-detail",
    getContext: () => ({
      resource: "accounts",
      record: { accountName, stage },
    }),
  });
  const shortcutTask = useMemo<AIEmployeeTask>(
    () => ({
      title: "Review current renewal",
      message: { user: "Review the current account renewal." },
      autoSend: false,
    }),
    []
  );
  const presetTask = useMemo<AIEmployeeTask>(
    () => ({
      title: "Recommend next renewal action",
      message: { user: "Recommend the next renewal action." },
      autoSend: false,
    }),
    []
  );
  const employeeTasks = useMemo<AIEmployeeTasks>(
    () => ({ [employee.username]: [presetTask] }),
    [employee.username, presetTask]
  );

  return (
    <AIPageContextScope context={contextReference}>
      <AIChatProvider
        id="inherited-context-demo"
        controller={controller}
        defaultEmployee={employee.username}
        employeeTasks={employeeTasks}
      >
        <Card className="gap-0 overflow-hidden py-0">
          <div className="grid min-h-[560px] xl:grid-cols-[minmax(0,1fr)_410px]">
            <div className="bg-muted/15 p-4 sm:p-5">
              <Card ref={contextRef}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Current account renewal</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Shortcut and conversation are inside this context scope.
                      </p>
                    </div>
                    <Badge variant="outline">Inherited</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="block space-y-2">
                    <Label htmlFor="inherited-account-name">Account</Label>
                    <Input
                      id="inherited-account-name"
                      value={accountName}
                      onChange={(event) => setAccountName(event.target.value)}
                    />
                  </label>
                  <label className="block space-y-2">
                    <Label>Renewal stage</Label>
                    <Select
                      value={stage}
                      onValueChange={(value) => value && setStage(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discovery">Discovery</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="committed">Committed</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="space-y-2 border-t pt-4">
                    <div className="text-xs text-muted-foreground">
                      Shortcut task without message.workContext
                    </div>
                    <AIEmployeeShortcut
                      aiEmployee={employee.username}
                      target={controller}
                      tasks={[shortcutTask]}
                      label="Review current renewal"
                      size={34}
                    />
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
                    The preset task “Recommend next renewal action” also has no
                    task context, so it inherits this scope.
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="min-h-0 border-t bg-card xl:border-l xl:border-t-0">
              <ChatInline className="h-[560px] rounded-none border-0">
                <AIChatWindow
                  showConversationToggle={false}
                  disclaimer={false}
                />
              </ChatInline>
            </div>
          </div>
        </Card>
      </AIChatProvider>
    </AIPageContextScope>
  );
}

function ContextSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
