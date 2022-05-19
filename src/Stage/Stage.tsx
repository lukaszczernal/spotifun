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
import { Footer } from '../components/Footer';
import { PlayerControls } from '../components/PlayerControls';
import { SplashText } from '../components/SplashText';
import { STAGE_SIZE } from '../config';
import { ScoreBoard } from '../ScoreBoard';
import { GameContext } from '../services/useGame';
import { usePlayer } from '../services/usePlayer';
import useRandomTracks from '../services/useRandomTracks';
import { Track } from '../services/useTracks';

const Stage = () => {
  const [selectedTrack, setSelectedTrack] = createSignal<Track>();
  const [{ stage }, gameAction] = useContext(GameContext)!;
  const { pause } = usePlayer()!;
  const { randomTracks, mysteryTrack } = useRandomTracks(stage)!;

  const goToNextStage = () =>
    gameAction.nextStage({
      correctTrack: mysteryTrack(),
      selectedTrack: selectedTrack(),
    });

  // TODO check if we should come back to stage result concept
  // const isCorrect = () => {
  //   const { correctTrack, selectedTrack } = stageScore() || {};
  //   return correctTrack?.track.id === selectedTrack?.track.id;
  // };

  createEffect(() => {
    stage(); // Only to trigger update
    setSelectedTrack();
  });

  onMount(() => {
    gameAction.startGame();
  });

  onCleanup(() => {
    gameAction.exitGame();
    pause();
  });

  return (
    <Switch fallback={<ScoreBoard />}>
      <Match when={stage() <= 3}>
        <SplashText subtitle={`Stage ${stage()}/${STAGE_SIZE}`}>
          Guess cover by sample
        </SplashText>

        <CoverScroll
          tracks={randomTracks()}
          onTrackSelect={setSelectedTrack}
          onClick={goToNextStage}
        />

        <Show when={mysteryTrack()}>
          <PlayerControls track={mysteryTrack} />
        </Show>

        <Footer>
          <Button href="" onClick={goToNextStage} dark>
            I choose this cover
          </Button>
        </Footer>
      </Match>
    </Switch>
  );
};

export default Stage;
