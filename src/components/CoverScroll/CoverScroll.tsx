import { Component, createEffect, For, onMount } from 'solid-js';
import { Track } from '../../services/useTracks';
import { Swiper } from 'swiper';

// import styles from './CoverScroll.module.css'; // TODO convert to module
import 'swiper/css/bundle';
import 'swiper/css';
import './CoverScroll.css';

interface Props {
  tracks?: Track[];
  onTrackSelect: (track: Track) => any;
}

const CoverScroll: Component<Props> = (props) => {
  let swiperRef: any;

  const selectTrackByIndex = (index: number) => {
    const selectedTrack = props?.tracks?.[index];
    if (selectedTrack) {
      props?.onTrackSelect(selectedTrack);
    }
  };

  onMount(() => {
    swiperRef = new Swiper('.mySwiper', {
      slidesPerView: 'auto',
      spaceBetween: 20,
      centeredSlides: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    });
    swiperRef.on('realIndexChange', function () {
      selectTrackByIndex(swiperRef.realIndex);
    });
  });

  /**
   * Resets scroll if new tracks arrive
   */
  createEffect(() => {
    if (swiperRef.realIndex === 0) {
      selectTrackByIndex(swiperRef.realIndex);
    }
    if (swiperRef.realIndex > 0) {
      swiperRef.slideTo(0);
    }
  });

  return (
    <div class="coverScroll">
      <div class="swiper mySwiper">
        <div class="swiper-wrapper">
          <For each={props.tracks}>
            {(track) => (
              <div class="swiper-slide">
                <img src={track.track.album.images[1].url} />
              </div>
            )}
          </For>
        </div>
        <div class="swiper-pagination"></div>
      </div>
    </div>
  );
};

export default CoverScroll;
