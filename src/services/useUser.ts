import { createResource } from 'solid-js';
import { responseHandler } from './authorize';
import { useAuth } from './useAuth';

interface User {
  display_name: string;
}

const fetchUser = () => {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();
  return accessToken
    ? fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      }).then((res) => responseHandler<User>(res))
    : Promise.reject('Access Denied. Please log in.');
};

const useUser = () => createResource<User>(fetchUser);

export default useUser;
