export class NocoBaseHttpError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor({
    message,
    status,
    payload,
  }: {
    message: string;
    status: number;
    payload?: unknown;
  }) {
    super(message);
    this.name = "NocoBaseHttpError";
    this.status = status;
    this.payload = payload;
  }
}

export const getNocoBaseErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as {
    message?: string;
    error?: { message?: string };
    errors?: Array<{ message?: string } | string>;
    messages?: Array<{ message?: string } | string>;
  };
  const first = value.errors?.[0] ?? value.messages?.[0];
  if (typeof first === "string") return first;
  return first?.message ?? value.error?.message ?? value.message ?? fallback;
};
