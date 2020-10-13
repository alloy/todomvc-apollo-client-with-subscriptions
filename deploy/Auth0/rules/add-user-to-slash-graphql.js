/**
@param {object} user - The user being created
@param {string} user.id - user id
@param {string} user.tenant - Auth0 tenant name
@param {string} user.username - user name
@param {string} user.email - email
@param {boolean} user.emailVerified - is e-mail verified?
@param {string} user.phoneNumber - phone number
@param {boolean} user.phoneNumberVerified - is phone number verified?
@param {object} user.user_metadata - user metadata
@param {object} user.app_metadata - application metadata
@param {object} context - Auth0 connection and other context info
@param {string} context.requestLanguage - language of the client agent
@param {object} context.connection - information about the Auth0 connection
@param {object} context.connection.id - connection id
@param {object} context.connection.name - connection name
@param {object} context.connection.tenant - connection tenant
@param {object} context.webtask - webtask context
@param {function} cb - function (error, response)
*/

// After Auth0 has processed the user registration flow and added the user
// to its internal user list for the app, it calls this rule, which then adds
// the user to the Slash GraphQL graph.
//
// The user is needed in Slash GraphQL, so we can link the user to their data.
//
// In this case, we have secured the Slash GraphQL API so that the only way to
// add a user is if the request contains a valid Auth0 signed JWT that has the
// 'AddUser' permission, and the only way to get that is if you know the
// Auth0 secrets.
//
// This can be done in either a post-user-registration hook or a rule.  The post
// user registration isn't called with social connections, so a rule is the 
// best choice if you are going to enable social connections.

function addUserToSlashGraphQL(user, context, callback) {
  const axios = require("axios@0.19.2")
  const { GraphQLClient } = require("graphql-request@1.8.2")

  // Fill these values in with the details of your Auth0 "MACHINE TO MACHINE" application.
  // Creating the M2M app gives you the credentials needed to call the
  // "Client Credentials Exchange" and thus generate an Auth0 signed JWT.
  const authorizationHook = "<<your-M2M-hook>>"
  const clientID = "<<your-client-id>>"
  const clientSecret = "<<your-client-secret>>"
  const authAudience = "<<your-M2M-audience>>"

  // Fill this value with your Slash GraphQL instance.
  const slashGraphQL = "<<your-Slash-GraphQL-URL>>"

  const findUser = `
    query getUser($username: String!) {
      getUser(username: $username) {
        username
      }
    }
  `

  const addUser = `
    mutation($username: String!) {
      addUser(
        input: [
          {
            username: $username
            todos: [
              { value: "Get a Slash GraphQL account", completed: true }
              { value: "Deploy a GraphQL backend", completed: true }
              { value: "Build a React app", completed: false }
              { value: "Learn more GraphQL", completed: false }
              { value: "Build apps with Slash GraphQL", completed: false }
            ]
          }
        ]
      ) {
        user {
          username
        }
      }
    }
  `
  
  // First we call the "Client Credentials Exchange" hook to get a signed JWT that has
  // a claim to the "AddUser" role - we've set the schema so only that role can add a user.
  axios
    .post(authorizationHook, {
      client_id: clientID,
      client_secret: clientSecret,
      audience: authAudience,
      grant_type: "client_credentials",
    })
    .then(function (response) {
      // console.log(response.data.access_token)

      // Now we have a signed JWT in body.access_token, so we can add the new user
      // into Slash GraphQL with an authenticated GraphQL mutation.

      const client = new GraphQLClient(slashGraphQL, {
        headers: { Authorization: response.data.access_token },
      })

      client
        .request(findUser, { username: user.email })
        .then((data, error) => {
          if (error) {
            callback(error, user, context)
          } else if (data && data.getUser && data.getUser.username) {
            // The user is already in Slash GraphQL
            callback(null, user, context)
          } else {
            client
              .request(addUser, { username: user.email })
              .then((data, error) => {
                callback(error, user, context)
              })
              .catch((error) => {
                callback(error, user, context)
              })
          }
        })
        .catch((error) => {
          callback(error, user, context)
        })
    })
    .catch((error) => {
      callback(error, user, context)
    })
}
