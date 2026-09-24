import Cookies from "js-cookie";

export const COOKIE_PLAYER_NAME = "player_name";
export const COOKIE_MAX_AGE_DAYS = 30;

export function getPlayerNameCookie(): string | null {
  if (typeof window === "undefined") return null;
  const name = Cookies.get(COOKIE_PLAYER_NAME);
  return name ? name.trim() : null;
}

export function setPlayerNameCookie(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  Cookies.set(COOKIE_PLAYER_NAME, trimmed, {
    expires: COOKIE_MAX_AGE_DAYS,
    sameSite: "Lax",
  });
}

export function clearPlayerNameCookie(): void {
  Cookies.remove(COOKIE_PLAYER_NAME);
}
