
![Spotifun logo](Logo.png)

# Spotifun

A quiz app that let you match an album cover with a song sample. 

A round is 10 songs. For each one you will listen to a song sample and guess which album cover it belongs to. A wrong guess counts as a fail and moves on to the next song, and at the end of the round you get your score.

## Deezer

Track data comes from the public [Deezer API](https://api.deezer.com). No account or login is required to play — the quiz is built from public Deezer playlists, which you pick from the game list, and song samples are the 30 second previews Deezer exposes for each track.

Deezer does not send CORS headers, so the app fetches playlists using JSONP. Track availability is region dependent: tracks that are not playable in your country arrive without a preview and are skipped.

## Development status

The game is in "alpha" stage. Error handling and UX improvements are next.

### Todos
- [ ] Add error handling
- [ ] Add stage result - user should see the result of each stage imediatelly
- [ ] Add count down before the sample start playing
- [ ] Add confetti animation at the end 


## How to play the game

The game is deployed on github pages at this moment.

Link to the game https://lukaszczernal.github.io/spotifun