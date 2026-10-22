import { timingSafeEqual } from './tokens';

export function isCronAuthorized(request: Request, secret: string): boolean {
  return (
    Boolean(secret) &&
    timingSafeEqual(
      request.headers.get('authorization') ?? '',
      `Bearer ${secret}`
    )
  );
}
