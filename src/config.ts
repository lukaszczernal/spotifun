const getHost = () => import.meta.env.VITE_HOST;

export const MAX_FAIL_COUNT = 3;
export const STAGE_SIZE = 4;
export const CLIENT_ID = 'abf93a809b6c4f2fad2df581c00c329d'; // Your client id
export const HOST = getHost();
export const REDIRECT_URI = `${getHost()}/`; // Your redirect uri
export const SCOPE = 'user-read-private user-read-email user-library-read';
export const STATE_KEY = 'spotify_auth_state';