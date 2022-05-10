import { Component } from 'solid-js';

import styles from './Footer.module.css';

const Footer: Component = (props) => {
  return <section className={styles.footer}>{props.children}</section>;
};

export default Footer;
