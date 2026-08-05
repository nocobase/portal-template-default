import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { nocobaseClient } from "@nocobase/portal-sdk/client";
import type {
  PortalUserMetadataResponse,
  PortalUserMutationRequest,
  PortalUserRecord,
  PortalUsersListResponse,
} from "@shared/users";

import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserFormValues = Required<PortalUserMutationRequest>;

const emptyForm: UserFormValues = {
  username: "",
  nickname: "",
  email: "",
  password: "",
};

const getApiError = async (response: Response) => {
  const payload = await response.json().catch(() => undefined);
  if (payload && typeof payload === "object") {
    const message = (payload as { error?: unknown; message?: unknown }).error;
    if (typeof message === "string") return message;
    const fallback = (payload as { message?: unknown }).message;
    if (typeof fallback === "string") return fallback;
  }
  return `Request failed with ${response.status}`;
};

async function requestJson<T>(
  url: string,
  {
    body,
    method = body === undefined ? "GET" : "POST",
  }: {
    body?: unknown;
    method?: "GET" | "POST" | "PUT" | "DELETE";
  } = {}
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: nocobaseClient.getHeaders({ method, body }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const renewedToken = response.headers.get("x-new-token");
  if (renewedToken) nocobaseClient.setToken(renewedToken);

  if (!response.ok) {
    throw new Error(await getApiError(response));
  }

  return response.json() as Promise<T>;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getDisplayName = (user: PortalUserRecord) =>
  user.nickname || user.username || user.email || `User ${user.id}`;

export default function BffTestPage() {
  const [users, setUsers] = useState<PortalUsersListResponse>({
    rows: [],
    page: 1,
    pageSize: 10,
  });
  const [metadata, setMetadata] = useState<PortalUserMetadataResponse | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<PortalUserRecord | null>(
    null
  );
  const [editingUser, setEditingUser] = useState<PortalUserRecord | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userRows = Array.isArray(users.rows) ? users.rows : [];
  const pageSize = users.pageSize || 10;
  const pageCount =
    (users.totalPage ?? Math.ceil((users.count ?? 0) / pageSize)) || 1;
  const fieldCount = Array.isArray(metadata?.fields) ? metadata.fields.length : 0;

  const sampleEmail = useMemo(
    () => `portal-user-${Date.now().toString(36)}@example.com`,
    []
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (search.trim()) query.set("search", search.trim());

      const [list, usersMetadata] = await Promise.all([
        requestJson<PortalUsersListResponse>(`/_app/api/users?${query}`),
        requestJson<PortalUserMetadataResponse>("/_app/api/users/metadata"),
      ]);
      setUsers(list);
      setMetadata(usersMetadata);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load users"
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = useCallback(() => {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      email: sampleEmail,
      nickname: "Portal Demo User",
      username: `portal_${Date.now().toString(36)}`,
    });
  }, [sampleEmail]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const updateFormValue = (key: keyof UserFormValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectUser = async (user: PortalUserRecord) => {
    setError(null);
    try {
      setSelectedUser(
        await requestJson<PortalUserRecord>(`/_app/api/users/${user.id}`)
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load user detail"
      );
    }
  };

  const startEdit = (user: PortalUserRecord) => {
    setEditingUser(user);
    setForm({
      username: user.username ?? "",
      nickname: user.nickname ?? "",
      email: user.email ?? "",
      password: "",
    });
  };

  const saveUser = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload: PortalUserMutationRequest = {
        username: form.username,
        nickname: form.nickname,
        email: form.email,
        ...(editingUser ? {} : { password: form.password }),
      };

      if (editingUser) {
        await requestJson<PortalUserRecord>(`/_app/api/users/${editingUser.id}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await requestJson<PortalUserRecord>("/_app/api/users", {
          method: "POST",
          body: payload,
        });
      }

      resetForm();
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save user"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: PortalUserRecord) => {
    if (!window.confirm(`Delete ${getDisplayName(user)}?`)) return;

    setDeletingId(user.id);
    setError(null);

    try {
      await requestJson(`/_app/api/users/${user.id}`, { method: "DELETE" });
      if (selectedUser?.id === user.id) setSelectedUser(null);
      if (editingUser?.id === user.id) resetForm();
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete user"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center text-muted-foreground">
        <Breadcrumb />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <h2 className="text-3xl font-semibold">Portal Data BFF</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Users collection CRUD through custom Portal Server APIs backed by
            ctx.portalData.
          </p>
        </div>
        <Button onClick={loadUsers} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  {users.count ?? userRows.length} records · {fieldCount} metadata fields
                </CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search users"
                    className="pl-8"
                    placeholder="Search username, nickname, email"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Button variant="outline" onClick={resetForm}>
                  <Plus className="size-4" />
                  New
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRows.map((user) => (
                  <TableRow key={String(user.id)}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{getDisplayName(user)}</span>
                        {user.username && (
                          <span className="text-xs text-muted-foreground">
                            {user.username}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label="View user"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => selectUser(user)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          aria-label="Edit user"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => startEdit(user)}
                        >
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          aria-label="Delete user"
                          size="icon-sm"
                          variant="destructive"
                          disabled={deletingId === user.id}
                          onClick={() => deleteUser(user)}
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!userRows.length && (
                  <TableRow>
                    <TableCell
                      className="h-32 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      {loading ? "Loading users..." : "No users found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Badge variant="secondary">
                Page {page} / {pageCount}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{editingUser ? "Update user" : "Create user"}</CardTitle>
                  <CardDescription>
                    {editingUser ? `Editing ${getDisplayName(editingUser)}` : "New users collection record"}
                  </CardDescription>
                </div>
                {editingUser && (
                  <Button
                    aria-label="Cancel edit"
                    size="icon-sm"
                    variant="ghost"
                    onClick={resetForm}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="portal-user-username">Username</Label>
                <Input
                  id="portal-user-username"
                  value={form.username}
                  onChange={(event) => updateFormValue("username", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portal-user-nickname">Nickname</Label>
                <Input
                  id="portal-user-nickname"
                  value={form.nickname}
                  onChange={(event) => updateFormValue("nickname", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portal-user-email">Email</Label>
                <Input
                  id="portal-user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateFormValue("email", event.target.value)}
                />
              </div>
              {!editingUser && (
                <div className="grid gap-2">
                  <Label htmlFor="portal-user-password">Password</Label>
                  <Input
                    id="portal-user-password"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateFormValue("password", event.target.value)}
                  />
                </div>
              )}
              <Button onClick={saveUser} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {editingUser ? "Update" : "Create"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected user</CardTitle>
              <CardDescription>
                {selectedUser ? getDisplayName(selectedUser) : "No user selected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-5">
                {JSON.stringify(selectedUser ?? { waiting: true }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
