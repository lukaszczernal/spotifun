import anime from "animejs";

/**
 * The whole record slide, run once the player swipes or taps to continue. Up
 * to that point the record stays where it was playing, so this travels from
 * rest. The last leg is a snap reset that parks the record below the viewport
 * for the next question.
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
