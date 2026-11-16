export const getErrorMessage = (err: unknown, fallback: string) => err instanceof Error && err.message ? err.message : fallback;
