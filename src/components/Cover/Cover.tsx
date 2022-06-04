import { Component, createEffect } from 'solid-js';
import { Track } from '../../services/useTracks';
import styles from './Cover.module.css';

interface Props {
  track?: Track;
  isSelected?: boolean;
  position: number;
  onClick: (track?: Track) => any;
}

const transformMap = [
  { bottom: '-107%', right: '-107%' },
  { bottom: '-107%', left: '-107%' },
  { top: '-107%', right: '-107%' },
  { top: '-107%', left: '-107%' },
];

const getSelectedStyle = (index: number) => ({
  'z-index': 3,
  ...transformMap[index],
});

const Cover: Component<Props> = (props) => {
  let coverRef: HTMLAnchorElement;

  createEffect(() => {
    const hammerCover = new Hammer(coverRef, {
      recognizers: [[Hammer.Swipe], [Hammer.Tap]],
    });
    hammerCover.on('swipe tap', () => {
      console.log('swipe tap')
      props.onClick(props.track);
    });
  });

  return (
    <div className={styles.cover__placeholder}>
      <a
        style={props.isSelected ? getSelectedStyle(props.position) : {}}
        className={styles.cover}
        ref={coverRef}
      >
        <img src={props.track?.track.album.images[0].url} />
      </a>
    </div>
  );
};

export default Cover;
