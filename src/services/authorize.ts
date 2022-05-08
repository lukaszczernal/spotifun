import { CLIENT_ID, REDIRECT_URI, SCOPE, STATE_KEY } from '../config';
import { generateRandomString, getHashParams } from './utils';

interface ErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

export const login = () => {
  var state = generateRandomString(16);

  localStorage.setItem(STATE_KEY, state);

  let url = 'https://accounts.spotify.com/authorize';
  url += '?response_type=token';
  url += '&client_id=' + encodeURIComponent(CLIENT_ID);
  url += '&scope=' + encodeURIComponent(SCOPE);
  url += '&redirect_uri=' + encodeURIComponent(REDIRECT_URI);
  url += '&state=' + encodeURIComponent(state);

  // @ts-ignore
  window.location = url;
};

export const logout = () => {
  sessionStorage.removeItem(STATE_KEY);
  // @ts-ignore
  window.location = REDIRECT_URI;
};

export const authorize = () => {
  const params = getHashParams();

  const access_token = params.access_token,
    state = params.state,
    storedState = localStorage.getItem(STATE_KEY);

  if (access_token && (state == null || state !== storedState)) {
    alert('There was an error during the authentication');
  } else {
    localStorage.removeItem(STATE_KEY);

    if (access_token) {
      sessionStorage.setItem(STATE_KEY, access_token);
      // @ts-ignore
      window.location = REDIRECT_URI;
    }
  }
};

const errorCodeEffect: { [key in number]: () => any } = {
  401: logout,
};

export const responseHandler = <T>(res: Response) => {
  if (res.ok) {
    return res.json() as Promise<T>;
  } else {
    return res.json().then(({ error }: ErrorResponse) => {
      errorCodeEffect[error.status]?.();
      throw error;
    });
  }
};
