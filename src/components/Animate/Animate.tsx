import { Component } from 'solid-js/types/render/component';
import styles from './Animate.module.css';

export enum AnimationType {
  fadeIn = 'fadeIn',
  slideUp = 'slideUp',
}

interface Props {
  type: AnimationType;
}

const Animate: Component<Props> = (props) => {
  const animationClasses: { [key in AnimationType]?: any } = {
    [AnimationType.slideUp]: styles.animate__slideUp,
    [AnimationType.fadeIn]: styles.animate__fadeIn,
  };

  const getAnimationClass: (type: AnimationType) => string = (type) =>
    animationClasses[type];

  return (
    <div className={`${styles.animate} ${getAnimationClass(props.type)}`}>
      {props.children}
    </div>
  );
};

export default Animate;
