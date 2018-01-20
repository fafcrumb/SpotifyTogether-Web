const functions = require('firebase-functions');
const admin = require('firebase-admin');
const rp = require('request-promise-native');

admin.initializeApp(functions.config().firebase);

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
//const SPOTIFY_TRACKS_URL = 'https://api.spotify.com/v1/tracks';
/*
exports.countVoteChange = functions.database.ref('/tracks/{partyid}/{trackid}/votes/{voteid}').onWrite(event => { 
  const collectionRef = event.data.adminRef.parent;
  const countRef = collectionRef.parent.child('vote_count');

  countRef.once('value').then((snapshot) => {
    if (snapshot.val() || snapshot.val() === 0) {
      return countRef.transaction(current => {
        if (event.data.exists() && !event.data.previous.exists()) {
          return (current || 0) + 1;
        }
        else if (!event.data.exists() && event.data.previous.exists()) {
          return (current || 0) - 1;
        }
      });
    } else {
      console.log('Counter was deleted');
    }
  }).then(() => {
    console.log('Counter updated.');
  }).catch((err) => {
    console.log('Error updating counter', err.message);
  });
});
*/
exports.spotifyAuth = functions.https.onRequest((request, response) => {
  getSpotifyAccessToken().then((token) => {
    response.status(200).send(token);
  }).catch((err) => {
    console.log('Error getting or setting spotify token', err.message);
    response.sendStatus(500);
  });
});

const getSpotifyAccessToken = () => {
  const options = {
    method: 'POST',
    uri: SPOTIFY_TOKEN_URL,
    form: {
      grant_type: 'client_credentials',
    },
    headers: {
      // Change to line 2 for prod. Local serving can't read env vars
      authorization: `Basic ${SPOTIFY_ID_SECRET}`,
      //authorization: `Basic ${functions.config().spotify.idsecret}`,
    },
    json: true,
  };

  return new Promise((resolve, reject) => {
    rp(options).then((res) => {
      return admin.database().ref('/spotify-api-metadata/clientCredentials').set(res).then(() => {
        resolve(res.access_token);
      });
    }).catch((err) => {
      reject(err);
    });
  });
}

/*
* options: request promise options
* tokenOp: function that assigns the token
*/
/*const requestRetry = (options, tokenOp) => {
  return new Promise((resolve, reject) => {
    rp(options).then((res) => {
      if (res.statusCode === 401) {
        console.log('Token expired. Requesting new token');
        return getSpotifyAccessToken().then((token) => {
          console.log('New token recieved');
          tokenOp(token);
          return rp(options);
        });
      } else {
        return res;
      }
    }).then((res) => {
      resolve(res);
    }).catch((err) => {
      reject(err);
    });
  });
}*/

/*
exports.getTrackData = functions.database.ref('/tracks/{partyId}/{trackId}').onWrite(event => {
  if (event.data.previous.exists()) {
    console.log('Not a new write, exiting');
    return;
  }

  if (!event.data.exists()) {
    console.log('Delete operation, exiting');
    return;
  }

  const track = event.data.val();

  let options = {
    method: 'GET',
    uri: `${SPOTIFY_TRACKS_URL}/${track.id}`,
    json: true,
    resolveWithFullResponse: true,
    simple: false,
  };

  return admin.database().ref('/spotify/client_credentials').once('value').then((snapshot) => {

    const token = snapshot.val().access_token;
    
    options.headers = {authorization: `Bearer ${token}`};

    requestRetry(options, (token) => {
      options.headers = {authorization: `Bearer ${token}`};
    }).then((res) => {
      console.log('Recieved response with code: ' + res.statusCode);
      if (res.statusCode === 200) {
        return event.data.ref.update({
          name: res.body.name,
          artist: res.body.artists[0].name
        });
      } else {
        console.log('Error message: ' + res.body.error.message);
        return event.data.ref.remove();
      }
    }).catch((err) => {
      console.log('Error editing track submission', err.message);
    });
  });

});*/
