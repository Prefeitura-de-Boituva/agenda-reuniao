type ClassValue = string | number | bigint | boolean | null | undefined;

export function cn(...classes: Array<ClassValue>): string {
  return classes.filter(Boolean).join(" ");
}