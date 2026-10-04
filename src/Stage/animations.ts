import anime from "animejs";

/** Beat between picking the right cover and the record starting to move. */
export const RECORD_SLIDE_DELAY = 500;

/**
 * First half of the record slide: it comes to rest half hidden behind the
 * cover and stays there, so that the answer can be read before the stage
 * moves on.
 */
export const slideRecordHalfway = (recordRef: HTMLDivElement) => {
  return anime
    .timeline({
      targets: recordRef,
      easing: "easeOutExpo",
    })
    .add({
      translateY: "-50%",
      duration: 700,
      delay: RECORD_SLIDE_DELAY,
    });
};

/**
 * The rest of the slide, run once the player taps to continue. The last leg is
 * a snap reset that parks the record below the viewport for the next question.
 */
export const slideRecordHome = (recordRef: HTMLDivElement) => {
  return anime
    .timeline({
      targets: recordRef,
      easing: "easeOutExpo",
    })
    .add({
      translateY: "-100%",
      duration: 700,
    })
    .add({
      translateY: "-125%",
      duration: 1000,
    })
    .add({
      translateY: "100%",
      duration: 1,
    });
};
