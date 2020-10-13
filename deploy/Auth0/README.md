Minimal automated setup for Auth0 + Slash GraphQL --- see also 
https://github.com/dgraph-io/auth0-integration

The Auth0 setup for this app has these parts:

* An Auth0 app for the React UI.
* An endpoint to authorize adding new users during the signup flow.
* A rule that fires on signup to add new users into the Slash GraphQL backend
* A rule that fires on login to enrich the JWT with enough information (just username) for Slash GraphQL to apply authorization and thus restrict what todo lists a user can see.
