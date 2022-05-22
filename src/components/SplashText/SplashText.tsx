import { Component, For, Show } from 'solid-js';
import styles from './SplashText.module.css';

interface Props {
  subtitle?: string;
  multiline?: string[];
}

const SplashText: Component<Props> = (props) => {
  const mainText = (item?: any) => (
    <span className={styles.splashText__main}>{item}</span>
  );

  return (
    <section className={styles.splashText}>
      {mainText(props.children)}
      <Show when={props.multiline}>
        <For each={props.multiline || []}>{mainText}</For>
      </Show>
      <Show when={props.subtitle}>
        <span>{props.subtitle}</span>
      </Show>
    </section>
  );
};

export default SplashText;
