export function stripMarkdownIframes(value: string) { return value.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "").replace(/<iframe\b[^>]*\/?>/gi, ""); }
