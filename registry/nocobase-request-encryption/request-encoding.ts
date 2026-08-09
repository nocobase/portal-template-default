import type { NocoBaseQuery, NocoBaseQueryTransformer } from "@nocobase/portal-sdk/client";
export function base64EncodeUnicode(value: string) { const bytes = new TextEncoder().encode(value); let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }
export function base64DecodeUnicode(value: string) { const binary = atob(value); const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); return new TextDecoder().decode(bytes); }
export function encodeRequestQuery(query: NocoBaseQuery): NocoBaseQuery { if (!Object.keys(query).length || typeof query.__encoded__ === "string") return query; return { __encoded__: base64EncodeUnicode(JSON.stringify(query)) }; }
export function decodeRequestQuery(value: string): NocoBaseQuery { const parsed = JSON.parse(base64DecodeUnicode(value)); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Encoded query must contain an object."); return parsed as NocoBaseQuery; }
export const requestEncryptionTransformer: NocoBaseQueryTransformer = encodeRequestQuery;
