if('serviceWorker' in navigator) {window.addEventListener('load', () => {navigator.serviceWorker.register('/spotifun/sw.js', { scope: '/spotifun/' })})}