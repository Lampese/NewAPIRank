export function verifyInternalKey(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.INTERNAL_API_KEY}`;
}
