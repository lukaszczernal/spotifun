// anime() drives its timelines off requestAnimationFrame, which makes a
// 10-guess round take ~20s of real time. The harness only cares about game
// logic, so animations resolve immediately and record nothing.
const anime = () => ({ finished: Promise.resolve() });

anime.timeline = () => {
  const timeline = { finished: Promise.resolve() };
  timeline.add = () => timeline;
  return timeline;
};

anime.stagger = () => 0;

export default anime;
