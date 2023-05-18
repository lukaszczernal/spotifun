import { STATE_KEY } from '../config';
import { authorize, login, logout } from './authorize';

const getStore = () => {
  const getAccessToken = () => sessionStorage.getItem(STATE_KEY);
  
  // const isAuthenticated = () => Boolean(getAccessToken());
  const isAuthenticated = () => true;

  return { authorize, login, logout, getAccessToken, isAuthenticated } as const;
};

export const useAuth = () => {
  return getStore();
};
