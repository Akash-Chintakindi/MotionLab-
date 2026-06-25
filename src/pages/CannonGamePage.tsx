import { AppShell } from "../components/AppShell";
import { CannonGame } from "../games/arcade/cannon/CannonGame";
import { useHighScore } from "../games/arcade/useHighScore";

export default function CannonGamePage() {
  const { highScore, submit } = useHighScore("cannon");
  return (
    <AppShell>
      <CannonGame
        highScore={highScore}
        onGameOver={({ score }) => submit(score)}
      />
    </AppShell>
  );
}
