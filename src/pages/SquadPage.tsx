import { AppShell } from "../components/AppShell";
import { SquadPanel } from "../components/SquadPanel";

export default function SquadPage() {
  return (
    <AppShell>
      <section data-testid="squad-page" className="mx-auto w-full max-w-2xl py-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Squad
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Make a private group with your class or friends and race on today's
          Question of the Day.
        </p>
        <div className="mt-6">
          <SquadPanel />
        </div>
      </section>
    </AppShell>
  );
}
