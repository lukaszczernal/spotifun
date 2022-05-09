import { Component } from 'solid-js';
import styles from './SplashText.module.css';

const SplashText: Component = ({ children }) => {
  return <span className={styles.splashText}>{children}</span>;
};

export default SplashText;
