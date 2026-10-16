import { PapertrailWordmark } from "@/components/brand/papertrail-wordmark";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/lib/auth/session";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  user: SessionUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      <aside className="hidden w-60 shrink-0 border-r border-border/80 bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center px-5">
          <PapertrailWordmark />
        </div>
        <Separator />
        <AppSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div className="md:hidden">
            <PapertrailWordmark />
          </div>
          <div className="flex-1 md:hidden" />
          <UserMenu user={user} />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
