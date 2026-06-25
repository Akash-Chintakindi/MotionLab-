import { AppShell } from "../components/AppShell";
import { PoolGame } from "../games/arcade/pool/PoolGame";
import { useHighScore } from "../games/arcade/useHighScore";

export default function PoolGamePage() {
  const { highScore, submit } = useHighScore("pool");
  return (
    <AppShell>
      <PoolGame highScore={highScore} onGameOver={({ score }) => submit(score)} />
    </AppShell>
  );
}
