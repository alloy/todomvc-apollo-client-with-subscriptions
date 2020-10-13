function addUsername(user, context, callback) {
  const namespace = "https://todo.dgraph.io/claims"
  context.idToken[namespace] = {
    username: user.email,
  }

  return callback(null, user, context)
}
