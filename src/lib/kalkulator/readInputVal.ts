export function readInputVal(id: string): string {
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  return el?.value ?? "";
}
