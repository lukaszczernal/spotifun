import { Component, createEffect } from "solid-js";
import { usePlayer } from "../../services/usePlayer";

const Player: Component = () => {
  let playerRef: HTMLAudioElement;
  const { state, play, source, continousPlay } = usePlayer()!;

  createEffect(() => {
    playerRef.addEventListener("loadeddata", () => {
      if (continousPlay()) {
        play();
      }
    });
  });

  createEffect(() => {
    if (source()) {
      playerRef.load();
    }
  });

  createEffect(() => {
    switch (state()) {
      case "play":
        playerRef.play();
        break;
      case "pause":
        playerRef.pause();
        break;
    }
  });

  return (
    <audio style={{ visibility: "hidden" }} ref={playerRef} loop>
      <source src={source()} type="audio/mpeg" />
    </audio>
  );
};

export default Player;
