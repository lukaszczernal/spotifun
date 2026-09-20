import { Component } from "solid-js";

import styles from "./App.module.css";
import { Stage } from "./Stage";
import { Splash } from "./Splash";
import { Route, Routes, useLocation } from "solid-app-router";
import { Logo } from "./components/Logo";
import { Player } from "./components/Player";
import { ScoreBoard } from "./ScoreBoard";
import { GameList } from "./GameList";

const App: Component = () => {
  const location = useLocation();
  const inGame = () => location.pathname.startsWith("/game");

  return (
    <>
      <div className={`${styles.app} ${inGame() ? styles.app__stage : ""}`}>
        <Logo compact={inGame()} />
        <Routes>
          <Route path="/gamelist" element={<GameList />} />
          <Route path="/game">
            <Route path="/score" element={<ScoreBoard />} />
            <Route path="/:playlistId" element={<Stage />} />
          </Route>
          <Route path="/*" element={<Splash />} />
        </Routes>
      </div>
      <Player />
    </>
  );
};

export default App;
