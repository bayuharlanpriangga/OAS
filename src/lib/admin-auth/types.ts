export type PeranBisnis = "owner" | "admin" | "member" | "viewer";

export interface CompanyLike {
  id: string;
  name?: string;
  user_id?: string;
  _role?: string;
  [key: string]: unknown;
}
