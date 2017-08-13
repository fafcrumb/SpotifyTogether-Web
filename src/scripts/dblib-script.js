
const dblib = {};
let db;

dblib.init = (firebaseDatabase) => {
  db = firebaseDatabase;
}

dblib.userPath = (uid) => {
  return `users/${uid}`;
}

dblib.userPartyPath = (uid) => {
  return `users/${uid}/party`;
}

dblib.partyMemberPath = (partyId, uid) => {
  return `members/${partyId}/${uid}`;
}

dblib.getUser = (uid, ref) => {
  return db.ref(dblib.userPath(uid)).once('value').then((snapshot) => {
    return snapshot.val();
  });
}

dblib.addUser = (user) => {
  return db.ref(dblib.userPath(user.uid)).set({
    display_name: user.displayName,
    isAnonymous: user.isAnonymous
  });
}

dblib.deleteUser = (user, currParty) => {
  const updates = {};
  if (currParty) {
    updates[dblib.partyMemberPath(currParty, user.uid)] = null;
  }
  updates[dblib.userPath(user.uid)] = null;
  return Promise.all([db.ref().update(updates), user.delete()]);
}

dblib.getUserParty = (uid) => {
  return db.ref(dblib.userPartyPath(uid)).once('value').then((snapshot) => {
    return snapshot.val();
  }); 
}

dblib.joinParty = (partyId, uid) => {
  const updates = {};
  updates[dblib.userPartyPath(uid)] = partyId;
  updates[dblib.partyMemberPath(partyId, uid)] = true;
  return db.ref().update(updates);
}

dblib.leaveParty = (partyId, uid) => {
  const updates = {};
  updates[dblib.userPartyPath(uid)] = null;
  updates[dblib.partyMemberPath(partyId, uid)] = null;
  return db.ref().update(updates);
}

dblib.switchToParty = (uid, newParty, oldParty) => {
  const updates = {};
  updates[dblib.userPartyPath(uid)] = newParty;
  updates[dblib.partyMemberPath(newParty, uid)] = true;
  if (oldParty) {
    updates[dblib.partyMemberPath(oldParty, uid)] = null;
  }
  return db.ref().update(updates);
}