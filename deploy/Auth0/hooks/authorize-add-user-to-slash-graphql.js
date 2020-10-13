/**
@param {object} client - information about the client
@param {string} client.name - name of client
@param {string} client.id - client id
@param {string} client.tenant - Auth0 tenant name
@param {object} client.metadata - client metadata
@param {array|undefined} scope - array of strings representing the scope claim or undefined
@param {string} audience - token's audience claim
@param {object} context - additional authorization context
@param {object} context.webtask - webtask context
@param {function} cb - function (error, accessTokenClaims)
*/

// Add this hook as a "Client Credentials Exchange" hook.
// You'll need to set up a corresponding "MACHINE TO MACHINE"
// application so you can get a client ID and secret to
// call this hook (see add-user-to-slash-graphql.js for how it's called).
//
// This gets called by Auth0 "Post User Registration" to generate
// a special JWT that has the permission to add a new user to Slash GraphQL.
//
// There's no way to get such a JWT except via this code, and it
// can only be run by the Post User Registration in Auth0 (or
// if you know the Auth0 secrets), so adding users is a secured
// flow in the app and can only happen for users who sign up
// using the Auth0 flow.

module.exports = function (client, scope, audience, context, cb) {
  var access_token = {}
  access_token.scope = scope
  access_token["https://todo.dgraph.io/claims"] = { role: "Admin" }

  cb(null, access_token)
}

/*
  Hooks docs on Client Credentials Exchange says:
  
  "You can create more than one hooks per extensibility point but only one can be enabled. 
  The enabled hook will then be executed for all applications and APIs."
  
  So I think that means everything on the Client Credentials Exchange runs through this hook.  
  So, really, if I had multiple things going on in my app, or different environments etc., 
  I'd want a more detailed hook that uses the 'input parameters' to pass some info into the request 
  so that I know what's really being asked for:
  
  https://auth0.com/docs/api-auth/tutorials/client-credentials/customize-with-hooks#input-parameters
  
  e.g. using the metadata field
  
  {
      "tenant":  "tenant_name",
      "id": "tenant_id",
      "name": "test_client",
      "metadata": {
          "some_metadata": "value"
      }
  }
  
  And then my hook would dish out the right permissions depending on what bit of my setup asked for it.
  
  For now, we just have the one process that's dishing out a special JWT for adding a new user.
  */
