import Link from "next/link";

export function PapertrailWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/documents"
      className={`font-semibold tracking-tight text-foreground ${className ?? ""}`}
    >
      Papertrail
    </Link>
  );
}
