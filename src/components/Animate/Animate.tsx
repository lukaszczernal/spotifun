import { Component } from 'solid-js/types/render/component';
import styles from './Animate.module.css';

export enum AnimationType {
  fadeIn = 'fadeIn',
  slideUp = 'slideUp',
}

interface Props {
  type: AnimationType;
  outCondition?: boolean;
}

const Animate: Component<Props> = (props) => {
  const animationClasses: { [key in AnimationType]: [string, string] } = {
    [AnimationType.slideUp]: [
      styles.animate__slideUp,
      styles.animate__slideUpOut,
    ],
    [AnimationType.fadeIn]: [styles.animate__fadeIn, styles.animate__fadeOut],
  };

  const getAnimationClass: (type: AnimationType) => string = (type) =>
    props.outCondition
      ? animationClasses[type].join(' ')
      : animationClasses[type][0];

  return (
    <div className={`${styles.animate} ${getAnimationClass(props.type)}`}>
      {props.children}
    </div>
  );
};

export default Animate;
