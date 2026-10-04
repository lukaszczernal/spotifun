// Like stage-round.stub-anime.js, but records what was asked of anime so the
// correct-answer record animation can be inspected: when it starts, how many
// legs it runs, and whether anything pauses it part way.
export const timelines = [];

const anime = () => ({ finished: Promise.resolve() });

anime.timeline = (params = {}) => {
  const record = { params, steps: [] };
  timelines.push(record);
  const timeline = {
    finished: Promise.resolve(),
    add(step) {
      record.steps.push(step);
      return timeline;
    },
    pause() {
      record.paused = true;
      return timeline;
    },
    play() {
      record.resumed = true;
      return timeline;
    },
  };
  return timeline;
};

anime.stagger = () => 0;

export const resetTimelines = () => {
  timelines.length = 0;
};

export default anime;
