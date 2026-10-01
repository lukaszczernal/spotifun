import anime from "animejs";

export const slideRecordInside = (recordRef: HTMLDivElement) => {
  return anime
    .timeline({
      targets: recordRef,
      easing: "easeOutExpo",
    })
    .add({
      translateY: "-100%",
      duration: 1400,
    })
    .add({
      targets: recordRef,
      translateY: "-125%",
      duration: 1000,
    })
    .add({
      translateY: "100%",
      duration: 1,
    });
};