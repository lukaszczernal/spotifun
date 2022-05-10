import {
  createEffect,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  useContext,
} from 'solid-js';
import { Button } from '../components/Button';
import { CoverScroll } from '../components/CoverScroll';
import { Player } from '../components/Player';
import { SplashText } from '../components/SplashText';
import { ScoreBoard } from '../ScoreBoard';
import { GameContext, Score } from '../services/useGame';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';

const Stage = () => {
  const [selectedTrack, setSelectedTrack] = createSignal<Track>();
  const [stageScore, setStageScore] = createSignal<Score | null>(null);
  const [{ stage }, gameAction] = useContext(GameContext)!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  const checkStage = () => {
    setStageScore({
      selectedTrack: selectedTrack(),
      correctTrack: mysteryTrack(),
    });
  };

  const isCorrect = () => {
    const { correctTrack, selectedTrack } = stageScore() || {};
    return correctTrack?.track.id === selectedTrack?.track.id;
  };

  createEffect(() => {
    stage(); // Only to trigger update
    setStageScore(null);
    setSelectedTrack();
  });

  onMount(() => {
    gameAction.startGame();
  });

  onCleanup(() => {
    gameAction.exitGame();
  });

  return (
    <Switch fallback={<ScoreBoard />}>
      <Match when={stage() <= 3}>
        <SplashText>Guess cover by sample</SplashText>

        <Show when={stageScore()}>
          {isCorrect() ? 'You are right!' : 'Sorry, wrong cover'}
        </Show>

        <CoverScroll tracks={randomTracks()} onTrackSelect={setSelectedTrack} />

        <Show when={mysteryTrack()}>
          <Player track={mysteryTrack} />
        </Show>

        <Show when={stageScore() === null}>
          <Button href="" onClick={checkStage}>
            Check
          </Button>
        </Show>

        <Show when={stageScore()}>
          <Button
            href=""
            onClick={() =>
              gameAction.nextStage({
                correctTrack: mysteryTrack(),
                selectedTrack: selectedTrack(),
              })
            }
          >
            Next stage
          </Button>
        </Show>
      </Match>
    </Switch>
  );
};

export default Stage;
