import { Component, createEffect } from 'solid-js';
import { usePlayer } from '../../services/usePlayer';

const Player: Component = () => {
  let playerRef: any; // TODO typings
  const { state, source } = usePlayer()!;

  createEffect(() => {
    source();
    if (source()) {
      playerRef.load();
      playerRef.play();
    }
  });

  createEffect(() => {
    switch (state()) {
      case 'play':
        playerRef.play();
        break;
      case 'pause':
        playerRef.pause();
        break;
    }
  });

  return (
    <audio style={{ visibility: 'hidden' }} ref={playerRef} loop>
      <source src={source()} type="audio/mpeg" />
    </audio>
  );
};

export default Player;
