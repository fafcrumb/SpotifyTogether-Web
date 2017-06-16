const functions = require('firebase-functions');
const rp = require('request-promise-native');

exports.spotifyAuth = functions.https.onRequest((request, response) => {
  const options = {
    method: 'POST',
    uri: 'https://accounts.spotify.com/api/token',
    form: {
      grant_type: 'client_credentials',
    },
    headers: {
      authorization: 'Basic MjJjZDVkM2EwMzA0NGZiYzlkOWQwZWM5YjIzZmE2NmI6ZmU1Mzg5MmU3YTgwNDQ3Yjk0M2YwYWE2NmMxOWRkYzA=',
    },
  };

  rp(options)
    .then((parsedBody) => {
      console.log(parsedBody);
      response.send(parsedBody);
    })
    .catch((err) => {
      console.error(err.message);
      response.send(err.message);
    });
});
