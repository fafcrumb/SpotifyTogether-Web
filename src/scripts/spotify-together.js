// API for all underlying data events in spotifytogether

(function () {
  class SpotifyTogether {
    constructor(firebaseRef) {
      // Cache the provided Database reference and the firebase.App instance
      this._spotifyTogetherRef = firebaseRef;
      this._firebaseApp = firebaseRef.database.app;

      // User-specific instance variables.
      this._user = null;
      this._userId = null;

      // The user's current party
      this._party = null;

      // A mapping of event IDs to an array of callbacks.
      this._events = {};

      // Commonly-used Firebase references.
      this._userRef = null;
      this._partyRef = this._spotifyTogetherRef.child('party-metadata');
      this._trackRef = this._spotifyTogetherRef.child('party-tracks');
      this._partyCodeRef = this._spotifyTogetherRef.child('party-codes');
      this._spotifyMetaDataRef = this._spotifyTogetherRef.child('spotify-api-metadata');
    }

    // Private
    // -------

    // Load the initial metadata for the user's account and set initial state.
    _loadUserMetadata() {
      // Update the user record with a default name on user's first visit.
      return this._userRef.child('meta-data').transaction((current) => {
        if (!current || !current.id || !current.name || current.isAnonymous === undefined) {
          return {
            id: this._userId,
            name: this._userName || "Anon",
            isAnonymous: this._isAnonymous
          };
        }
      });
    }

    // Append the new callback to our list of event handlers.
    _addEventCallback(eventId, callback) {
      this._events[eventId] = this._events[eventId] || [];
      this._events[eventId].push(callback);
    }

    // Retrieve the list of event handlers for a given event id.
    _getEventCallbacks(eventId) {
      if (this._events.hasOwnProperty(eventId)) {
        return this._events[eventId];
      }
      return [];
    }

    // Invoke each of the event handlers for a given event id with specified data.
    _invokeEventCallbacks(eventId) {
      let args = [];
      const callbacks = this._getEventCallbacks(eventId);

      Array.prototype.push.apply(args, arguments);
      args = args.slice(1);

      for (let i = 0; i < callbacks.length; i += 1) {
        callbacks[i].apply(null, args);
      }
    }

    // Initialize Firebase listeners and callbacks for the supported bindings.
    _setupDataEvents() {
      // Listen for state changes for the given user.
      this._userRef.child('meta-data').on('value', this._onUpdateUser, this);
    }

    // Event to monitor current user state.
    _onUpdateUser(snapshot) {
      this._user = snapshot.val();
      this._userName = this._user ? this._user.name : null;
      this._invokeEventCallbacks('user-update', this._user);
    }

    // Event to monitor current auth + user state.
    _onAuthRequired() {
      this._invokeEventCallbacks('auth-required');
    }

    _onEnterParty(partyId) {
      this._invokeEventCallbacks('party-enter', partyId);
    }

    _onTracksDownloaded() {
      this._invokeEventCallbacks('tracks-downloaded');
    }
    
    _onNewTrack(snapshot, prevChildKey) {
      const track = snapshot.val();
      track.id = snapshot.key;
      this._invokeEventCallbacks('track-add', track, prevChildKey);
    }
    
    _onRemoveTrack(snapshot) {
      const trackId = snapshot.key;
      this._invokeEventCallbacks('track-remove', trackId);
    }

    _onChangedTrack(snapshot) {
      const track = snapshot.val();
      track.id = snapshot.key;
      this._invokeEventCallbacks('track-change', track);
    }

    _onMovedTrack(snapshot, prevChildKey) {
      const trackId = snapshot.key;
      this._invokeEventCallbacks('track-move', trackId, prevChildKey);
    }

    _onLeaveParty(partyId) {
      this._invokeEventCallbacks('party-leave', partyId);
    }

    _onSpotifyAccessToken(snapshot) {
      const token = snapshot.val().access_token;
      this._invokeEventCallbacks('access-token', token)
    }

    // Public
    // ------

    // Initialize
    setUser(userId, userName, isAnon) {
      return new Promise((resolve, reject) => {
        this._firebaseApp.auth().onAuthStateChanged((user) => {
          if (user) {
            this._userId = userId.toString();
            this._userName = userName ? userName.toString() : null;
            this._isAnonymous = isAnon;
            this._userRef = this._spotifyTogetherRef.child('users').child(this._userId);

            this._loadUserMetadata().then(() => {
              Polymer.Async.timeOut.after(0).run(() => {
                resolve(this._user);
                this._setupDataEvents();
              });
            });
          } else {
            console.log('SpotifyTogether requires an authenticated Firebase reference. Pass an authenticated reference before loading.');
          }
        });
      });
    };

    // Callback registration. Supports each of the following events:
    on(eventType, cb) {
      this._addEventCallback(eventType, cb);
    }

    findPartyWithCode(code) {
      return this._partyCodeRef.child(code).once('value').then((snapshot) => {
        return snapshot.val();
      });
    }

    enterParty(partyId) {
      return new Promise((resolve, reject) => {
        return Promise.resolve().then(() => {
          if (!this._user) {
            return firebase.auth().signInAnonymously();
          }
        }).then(() => {
          return this.getParty(partyId);
        }).then((party) => {
          if (!partyId || !party) return;

          // Cancel if we're already in this party.
          if (this._party === partyId) {
            console.log('Already in this party');
            return;
          }

          this._party = partyId;

          const updates = {};
          updates[`users/${this._userId}/party`] = partyId;
          updates[`party-members/${this._party}/${this._userId}`] = true;
          resolve(this._spotifyTogetherRef.update(updates));

          this._onEnterParty(partyId);
          this._trackRef.child(this._party).once('value', (snapshot) => {
            this._onTracksDownloaded();
          });

          this._trackRef.child(this._party).orderByChild('timestamp').on('child_added', (snapshot, prevChildKey) => {
            this._onNewTrack(snapshot, prevChildKey);
          });

          this._trackRef.child(this._party).orderByChild('timestamp').on('child_removed', (snapshot) => {
            this._onRemoveTrack(snapshot);
          });

          this._trackRef.child(this._party).orderByChild('timestamp').on('child_changed', (snapshot) => {
            this._onChangedTrack(snapshot);
          });

          this._trackRef.child(this._party).orderByChild('timestamp').on('child_moved', (snapshot, prevChildKey) => {
            this._onMovedTrack(snapshot, prevChildKey);
          });

          this._spotifyMetaDataRef.child('clientCredentials').on('value', (snapshot) => {
            this._onSpotifyAccessToken(snapshot);
          });
        });
      });
    }

    leaveParty() {
      return new Promise((resolve, reject) => {
        if (!this._party) {
          console.log('Current user is not in a party');
          return;
        }

        // Remove listener for new messages to this room.
        this._trackRef.child(this._party).off();

        if (this._user) {
          const updates = {};
          updates[`party-members/${this._party}/${this._userId}`] = null;
          updates[`users/${this._userId}/party`] = null;
          resolve(this._spotifyTogetherRef.update(updates));
        }

        const partyId = this._party;
        this._party = null;

        // Invoke event callbacks for the room-exit event.
        this._onLeaveParty(partyId);
      });
    }

    addTrack(spotifyTrackId, name, artist, album) {
      const newTrack = {
        spotifyTrackId: spotifyTrackId,
        userId: this._userId,
        name: name,
        album: album,
        artist: artist,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      }
      
      const lastSubmitTime = {
        trackId: spotifyTrackId,
        time: firebase.database.ServerValue.TIMESTAMP
      };

      if (!this._user) {
        //this._onAuthRequired();
        console.log('Not authenticated or user not set');
        return;
      }

      const updates = {};
      updates[`party-tracks/${this._party}/${spotifyTrackId}`] = newTrack;
      updates[`users/${this._userId}/last-submitted-times/${this._party}`] = lastSubmitTime;
      this._spotifyTogetherRef.update(updates);
      //const newTrackRef = this._trackRef.child(this._party).child(spotifyTrackId);
      // TODO: Ask about setting with priority in a multilocation update.
      //return newTrackRef.setWithPriority(newTrack, firebase.database.ServerValue.TIMESTAMP);
    }

    // addVote: boolean, whether to add or remove the vote
    voteTrack(trackId, addVote) {
      if (!this._user) {
        //this._onAuthRequired();
        console.log('Not authenticated or user not set');
        return;
      }

      return this._trackRef.child(this._party).child(trackId).child('votes').child(this._userId).set(addVote || null);
    }

    getParty(partyId) {
      return this._partyRef.child(partyId).once('value').then((snapshot) => {
        return snapshot.val();
      });
    }

    getUserParty() {
      return this._userRef.child('party').once('value').then((snapshot) => {
        return snapshot.val();
      });
    }
    
  }

  // Export as global
  window.SpotifyTogether = SpotifyTogether;
})();