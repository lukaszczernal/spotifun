import { Component, createEffect, on } from "solid-js";
import { usePlayer } from "../../services/usePlayer";
import { fetchPreviewUrl, isPreviewExpired } from "../../services/previewUrl";

const Player: Component = () => {
  let playerRef: HTMLAudioElement | undefined;
  const { state, play, sync, load, source, trackId, continousPlay } =
    usePlayer()!;

  // An expired preview URL is swapped for a fresh one, picking up from where
  // the track was. A fresh URL that fails as well is not refreshed again, so
  // a track that really cannot play does not loop through refreshes.
  let refreshPending = false;
  let refreshedSource: string | undefined;
  let resumeAt: number | undefined;

  const refreshSource = () => {
    if (refreshPending) {
      return;
    }

    const id = trackId();
    const staleSource = source();
    if (id === undefined || staleSource === refreshedSource) {
      sync("pause");
      return;
    }

    refreshPending = true;
    resumeAt = playerRef?.currentTime;
    fetchPreviewUrl(id)
      .then((freshUrl) => {
        refreshPending = false;
        // The stage may have moved on to another track in the meantime.
        if (source() === staleSource) {
          refreshedSource = freshUrl;
          load(freshUrl, id);
        }
      })
      .catch(() => {
        refreshPending = false;
        if (source() === staleSource) {
          sync("pause");
        }
      });
  };

  const startPlayback = () => {
    if (isPreviewExpired(source())) {
      refreshSource();
      return;
    }

    playerRef?.play().catch((error: DOMException) => {
      // An AbortError only means pause() or a new source got in first, which
      // has moved the state on already, and a broken source is reported
      // through the error event. A blocked autoplay is reported nowhere else.
      if (error.name === "NotAllowedError") {
        sync("pause");
      }
    });
  };

  const onLoadedData = () => {
    if (source() === refreshedSource) {
      // It loaded, so it may be refreshed again once it expires in turn.
      refreshedSource = undefined;
      playerRef!.currentTime = resumeAt ?? 0;
      resumeAt = undefined;
    } else if (state() !== "play" && continousPlay()) {
      // Flips the state, which starts the playback.
      play();
      return;
    }

    // The state already says play, so it will not change and start the
    // playback by itself.
    if (state() === "play") {
      startPlayback();
    }
  };

  createEffect(
    on(state, (current) => {
      switch (current) {
        case "play":
          startPlayback();
          break;
        case "pause":
          playerRef?.pause();
          break;
      }
    }),
  );

  return (
    <audio
      style={{ visibility: "hidden" }}
      ref={playerRef}
      src={source()}
      loop
      onLoadedData={onLoadedData}
      onPlay={() => sync("play")}
      onPause={() => sync("pause")}
      onError={refreshSource}
    />
  );
};

export default Player;
