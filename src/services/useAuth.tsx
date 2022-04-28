// import { Component, createContext, useContext } from 'solid-js';
import { STATE_KEY } from '../config';
import { authorize, login, logout } from './authorize';

// interface AuthProviderProps {
//   count: number;
// }

// type AuthContext = ReturnType<typeof getStore>;

// const AuthContext = createContext<AuthContext>();

const getStore = () => {
  const getAccessToken = () => sessionStorage.getItem(STATE_KEY);
  const isAuthenticated = () => Boolean(getAccessToken());

  return { authorize, login, logout, getAccessToken, isAuthenticated } as const;
};

// export const AuthProvider: Component<AuthProviderProps> = (props) => {
//   const store = getStore();

//   return <AuthContext.Provider value={store} children={props.children} />;
// };

export const useAuth = () => {
  return getStore();
  // return useContext(AuthContext);
};
