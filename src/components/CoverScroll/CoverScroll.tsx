import { Component, createEffect, For, onMount, Show } from 'solid-js';
import { Track } from '../../services/useTracks';
import { Swiper } from 'swiper';

// import styles from './CoverScroll.module.css'; // TODO convert to module
import 'swiper/css/bundle';
import 'swiper/css';
import './CoverScroll.css';

type SwiperModel = any; // TODO typings

interface Props {
  tracks?: Track[];
  onSelectIndex: (index: number) => any;
  onClick: (index: number) => any;
}

const CoverScroll: Component<Props> = (props) => {
  let swiperRef: SwiperModel;

  const onTrackClick = (swiper: SwiperModel) => {
    props.onClick(swiper.clickedIndex);
  };

  /**
   * Initialize swiper and add even listeners
   */
  onMount(() => {
    swiperRef = new Swiper('.mySwiper', {
      slidesPerView: 'auto',
      spaceBetween: 0,
      centeredSlides: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    });
    swiperRef.on('realIndexChange', function () {
      props.onSelectIndex(swiperRef.realIndex);
    });

    swiperRef.on('click', onTrackClick);
  });

  /**
   * Resets scroll if new tracks arrive
   */
  createEffect(() => {
    props.tracks; // just to detect changes
    if (swiperRef.realIndex === 0) {
      props.onSelectIndex(swiperRef.realIndex as number);
    }
    if (swiperRef.realIndex > 0) {
      swiperRef.slideTo(0);
    }
    swiperRef.update();
  });

  return (
    <div class="coverScroll">
      <div class="swiper mySwiper">
        <div class="swiper-wrapper">
          <For each={props.tracks}>
            {(track) => (
              <div class="swiper-slide">
                <Show when={track}>
                  <img src={track.track.album.images[1].url} />
                </Show>
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
