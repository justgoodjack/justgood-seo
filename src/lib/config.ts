export function env(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing environment variable ${name}`);
  return v ?? "";
}

export const todayUTC = () => new Date().toISOString().slice(0, 10);

export function addDays(date: string | Date, days: number): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00Z") : new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
