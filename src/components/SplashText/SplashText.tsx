import { Component, Show } from 'solid-js';
import styles from './SplashText.module.css';

interface Props {
  subtitle?: string;
}

const SplashText: Component<Props> = (props) => {
  return (
    <section className={styles.splashText}>
      <span className={styles.splashText__main}>{props.children}</span>
      <Show when={props.subtitle}>
        <span>{props.subtitle}</span>
      </Show>
    </section>
  );
};

export default SplashText;
