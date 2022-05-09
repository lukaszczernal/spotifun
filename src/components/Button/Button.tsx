import { Link, LinkProps } from 'solid-app-router';
import { Component } from 'solid-js';
import styles from './Button.module.css';

type Props = LinkProps;

const Button: Component<Props> = (props) => {
  return <Link className={styles.button} {...props} />;
};

export default Button;
