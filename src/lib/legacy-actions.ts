export function callOasGlobal(fnName: string, ...args: unknown[]): unknown {
  if (typeof window === "undefined") return undefined;
  const win = window as unknown as Record<string, unknown>;
  const fn = win[fnName];
  if (typeof fn === "function") {
    return (fn as (...callArgs: unknown[]) => unknown)(...args);
  }
  return undefined;
}
