import { Show } from "solid-js";
import { Navigate, useParams } from "solid-app-router";
import Stage from "./Stage";
import { useProgress } from "../services/useProgress";

/**
 * Gate on a playlist that has not been unlocked yet.
 *
 * The router puts every playlist at a url of its own, so hiding a locked one in
 * the menu is not a gate on its own - it can still be typed in, or come back
 * from a bookmark. Guarding here rather than inside Stage keeps the stage from
 * mounting at all, so no playlist is fetched for a playlist the player cannot
 * play yet.
 */
const StageRoute = () => {
  const params = useParams();
  const [{ isUnlocked }] = useProgress();

  return (
    <Show
      when={isUnlocked(params.playlistId)}
      fallback={<Navigate href="/gamelist" />}
    >
      <Stage />
    </Show>
  );
};

export default StageRoute;
