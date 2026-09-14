export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}
export const badRequest = (m) => json({ error: m }, 400);
export const unauthorized = (m = 'Unauthorized') => json({ error: m }, 401);
export const forbidden = (m = 'Forbidden') => json({ error: m }, 403);
export const notFound = (m = 'Not found') => json({ error: m }, 404);
export const serverError = (m = 'Server error') => json({ error: m }, 500);
