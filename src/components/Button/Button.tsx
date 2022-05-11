import { Link, LinkProps } from 'solid-app-router';
import { Component } from 'solid-js';
import styles from './Button.module.css';

type Props = LinkProps & {
  dark?: boolean;
};

const Button: Component<Props> = (props) => {
  return (
    <Link
      className={`${styles.button} ${props.dark ? styles.button__dark : ''}`}
      {...props}
    />
  );
};

export default Button;
