import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  Edit3,
  Eye,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
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
import type {
  LocalCacheReadResponse,
  LocalCacheWriteResponse,
  LocalCachedNotesResponse,
  LocalNoteMutationRequest,
  LocalNoteRecord,
  LocalNoteResponse,
  LocalNotesListResponse,
} from "@shared/local-data";

import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { portalApiPath } from "@/lib/portal-api";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserFormValues = Required<PortalUserMutationRequest>;
type NoteFormValues = Required<Pick<LocalNoteMutationRequest, "title">> &
  Pick<LocalNoteMutationRequest, "body">;

const emptyForm: UserFormValues = {
  username: "",
  nickname: "",
  email: "",
  password: "",
};

const emptyNoteForm: NoteFormValues = {
  title: "",
  body: "",
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
  const [localLoading, setLocalLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState("demo");
  const [cacheValue, setCacheValue] = useState(
    JSON.stringify({ ok: true }, null, 2)
  );
  const [cacheTtlMs, setCacheTtlMs] = useState("10000");
  const [cacheResult, setCacheResult] = useState<
    LocalCacheReadResponse | LocalCacheWriteResponse | null
  >(null);
  const [notes, setNotes] = useState<LocalNoteRecord[]>([]);
  const [cachedNotes, setCachedNotes] = useState<LocalCachedNotesResponse | null>(
    null
  );
  const [selectedNote, setSelectedNote] = useState<LocalNoteRecord | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormValues>({
    ...emptyNoteForm,
    title: "Portal local note",
    body: "Created from the BFF test page.",
  });

  const userRows = Array.isArray(users.rows) ? users.rows : [];
  const noteRows = Array.isArray(notes) ? notes : [];
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
        requestJson<PortalUsersListResponse>(portalApiPath(`/users?${query}`)),
        requestJson<PortalUserMetadataResponse>(
          portalApiPath("/users/metadata")
        ),
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

  const loadLocalData = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const [notesList, cachedList] = await Promise.all([
        requestJson<LocalNotesListResponse>(portalApiPath("/notes")),
        requestJson<LocalCachedNotesResponse>(portalApiPath("/notes/cached")),
      ]);

      setNotes(notesList.notes);
      setCachedNotes(cachedList);
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load local BFF data"
      );
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUsers(), loadLocalData()]);
  }, [loadLocalData, loadUsers]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
        await requestJson<PortalUserRecord>(portalApiPath(`/users/${user.id}`))
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
        await requestJson<PortalUserRecord>(
          portalApiPath(`/users/${editingUser.id}`),
          {
            method: "PUT",
            body: payload,
          }
        );
      } else {
        await requestJson<PortalUserRecord>(portalApiPath("/users"), {
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
      await requestJson(portalApiPath(`/users/${user.id}`), {
        method: "DELETE",
      });
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

  const getTrimmedCacheKey = () => cacheKey.trim() || "demo";

  const parseCacheValue = () => {
    const value = cacheValue.trim();
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const readCacheEntry = async () => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      setCacheResult(
        await requestJson<LocalCacheReadResponse>(
          portalApiPath(`/cache-manager/${encodeURIComponent(getTrimmedCacheKey())}`)
        )
      );
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to read cache entry"
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const writeCacheEntry = async () => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const query = new URLSearchParams();
      if (cacheTtlMs.trim()) query.set("ttlMs", cacheTtlMs.trim());
      const suffix = query.toString() ? `?${query}` : "";

      setCacheResult(
        await requestJson<LocalCacheWriteResponse>(
          portalApiPath(
            `/cache-manager/${encodeURIComponent(getTrimmedCacheKey())}${suffix}`
          ),
          {
            method: "PUT",
            body: {
              value: parseCacheValue(),
            },
          }
        )
      );
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to write cache entry"
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const clearCacheEntries = async () => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      await requestJson(portalApiPath("/cache-manager/clear"), {
        method: "POST",
      });
      setCacheResult(null);
      await loadLocalData();
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to clear cache"
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const createNote = async () => {
    setNoteSaving(true);
    setLocalError(null);

    try {
      const title = noteForm.title.trim();
      if (!title) throw new Error("Note title is required");

      const response = await requestJson<LocalNoteResponse>(
        portalApiPath("/notes"),
        {
          body: {
            title,
            body: noteForm.body?.trim() || null,
          } satisfies LocalNoteMutationRequest,
        }
      );

      setSelectedNote(response.note);
      setNoteForm({ ...emptyNoteForm, title: "", body: "" });
      await loadLocalData();
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create note"
      );
    } finally {
      setNoteSaving(false);
    }
  };

  const selectNote = async (note: LocalNoteRecord) => {
    setLocalError(null);

    try {
      const response = await requestJson<LocalNoteResponse>(
        portalApiPath(`/notes/${note.id}`)
      );
      setSelectedNote(response.note);
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load note"
      );
    }
  };

  const deleteNote = async (note: LocalNoteRecord) => {
    if (!window.confirm(`Delete note "${note.title}"?`)) return;

    setDeletingNoteId(note.id);
    setLocalError(null);

    try {
      await requestJson(portalApiPath(`/notes/${note.id}`), {
        method: "DELETE",
      });
      if (selectedNote?.id === note.id) setSelectedNote(null);
      await loadLocalData();
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete note"
      );
    } finally {
      setDeletingNoteId(null);
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

      {localError && (
        <Alert variant="destructive">
          <AlertTitle>Local BFF request failed</AlertTitle>
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="size-5 text-primary" />
              <CardTitle>cache-manager</CardTitle>
            </div>
            <CardDescription>
              Namespaced memory cache using the active Portal runtime scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cache-key">Key</Label>
              <Input
                id="cache-key"
                value={cacheKey}
                onChange={(event) => setCacheKey(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cache-value">Value</Label>
              <Textarea
                id="cache-value"
                className="min-h-28 font-mono text-xs"
                value={cacheValue}
                onChange={(event) => setCacheValue(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cache-ttl">TTL milliseconds</Label>
              <Input
                id="cache-ttl"
                inputMode="numeric"
                value={cacheTtlMs}
                onChange={(event) => setCacheTtlMs(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={writeCacheEntry} disabled={localLoading}>
                {localLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Write
              </Button>
              <Button
                variant="outline"
                onClick={readCacheEntry}
                disabled={localLoading}
              >
                <Eye className="size-4" />
                Read
              </Button>
              <Button
                variant="outline"
                onClick={clearCacheEntries}
                disabled={localLoading}
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-5">
              {JSON.stringify(cacheResult ?? { waiting: true }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="size-5 text-primary" />
                  <CardTitle>Kysely notes</CardTitle>
                </div>
                <CardDescription>
                  SQLite records queried through Kysely, with cached list timing.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {cachedNotes?.cache && (
                  <Badge variant="secondary">
                    {cachedNotes.cache.source} · {cachedNotes.cache.durationMs}ms
                  </Badge>
                )}
                <Button
                  variant="outline"
                  onClick={loadLocalData}
                  disabled={localLoading}
                >
                  {localLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noteRows.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell>{note.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{note.title}</span>
                          {note.body && (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {note.body}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(note.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label="View note"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => selectNote(note)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            aria-label="Delete note"
                            size="icon-sm"
                            variant="destructive"
                            disabled={deletingNoteId === note.id}
                            onClick={() => deleteNote(note)}
                          >
                            {deletingNoteId === note.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!noteRows.length && (
                    <TableRow>
                      <TableCell
                        className="h-32 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        {localLoading ? "Loading notes..." : "No notes found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={noteForm.title}
                  onChange={(event) =>
                    setNoteForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note-body">Body</Label>
                <Textarea
                  id="note-body"
                  className="min-h-24"
                  value={noteForm.body ?? ""}
                  onChange={(event) =>
                    setNoteForm((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                />
              </div>
              <Button onClick={createNote} disabled={noteSaving}>
                {noteSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Create note
              </Button>
              <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-5">
                {JSON.stringify(
                  selectedNote ??
                    cachedNotes ?? {
                      waiting: true,
                    },
                  null,
                  2
                )}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
