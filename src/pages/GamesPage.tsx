import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";

interface GameCard {
  to: string;
  emoji: string;
  title: string;
  blurb: string;
  gradient: string;
  testid: string;
}

const GAMES: GameCard[] = [
  {
    to: "/games/pool",
    emoji: "🎱",
    title: "Physics Pool",
    blurb:
      "Read each ball's coordinates, then calculate the angle and speed to sink the shot. Real ghost-ball geometry and friction.",
    gradient: "from-emerald-600 to-green-800",
    testid: "game-card-pool",
  },
  {
    to: "/games/basketball",
    emoji: "🏀",
    title: "Buzzer Beater",
    blurb:
      "Aim, time your shot meter, and bank baskets against the clock. Answer physics questions to earn extra seconds.",
    gradient: "from-orange-500 to-rose-700",
    testid: "game-card-basketball",
  },
  {
    to: "/games/cannon",
    emoji: "💣",
    title: "Cannon Duel",
    blurb:
      "Drag to aim your cannon across shifting terrain and out-blast an AI rival. Answer physics questions to earn extra ammo and shields.",
    gradient: "from-sky-600 to-indigo-800",
    testid: "game-card-cannon",
  },
  {
    to: "/games/bosses",
    emoji: "⚔️",
    title: "Boss Tower",
    blurb:
      "Beat each lesson's quiz to unlock a Punch-Out!!-style boss. Dodge, block, and counter your way up all ten Forces to The Singularity.",
    gradient: "from-fuchsia-600 to-purple-900",
    testid: "game-card-bosses",
  },
];

export default function GamesPage() {
  return (
    <AppShell>
      <section data-testid="games-page" className="mx-auto w-full max-w-5xl py-2">
        <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-slate-100">Games</h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
          Arcade challenges that make you use the physics you've learned.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              data-testid={g.testid}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${g.gradient} p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl`}
            >
              <div className="text-5xl drop-shadow-sm" aria-hidden>
                {g.emoji}
              </div>
              <h2 className="mt-4 text-2xl font-bold">{g.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                {g.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
                Play
                <span aria-hidden className="transition group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
