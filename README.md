# Multi-user task-list React App powered by Slash GraphQL

Task-list React App using GraphQL build by Dgraph Labs and powered by [Slash GraphQL](https://dgraph.io/slash-graphql).

![Todo App Screenshot](./SlashGraphQLTodos.png)

This app is a serverless, multi-user GraphQL app that has a GraphQL backend deployed on Slash GraphQL; built in auth, through an [Auth0](https://auth0.com/) login and Slash GraphQL authorization; and UI deployed to [Netlify](https://www.netlify.com/).  There's an accompanying blog post (coming soon) on the Auth0 blog site that walks you through creating an app like this one.

This repo contains a number of versions of the app:

* If you are just getting started with Slash GraphQL, you might want to start with the the branch [`get-started-blog`](https://github.com/dgraph-io/tudo-tutorial/tree/get-started-blog) and this [blog post](https://dgraph.io/blog/post/todo-slash-graphql/).
* If you are interested in the serverless multi-user app, then this, `master`, branch is right for you.  Keep reading below.

You can also head over to our [docs](https://dgraph.io/docs/graphql/overview/) to read other getting started guides and tutorials.

## Multi-user app

The app has this serverless tech stack:

* Serverless GraphQL backend deployed on Slash GraphQL.  Backed by a GraphQL database and with built-in authorization that only allows users to see their own tasks.  See dir `/deploy/SlashGraphQL`.
* Serverless authentication from [Auth0](https://auth0.com/).  The login flow is through Auth0 which returns a signed JWT on successful login.  The React UI then presents that JWT to Slash GraphQL with any GraphQL requests.  Slash GraphQL uses the JWT to ensure users can only see/modify their own todos.  See the Auth0 setup in dir `/deploy/Auth0`.
* UI auto deployed on [Netlify](https://www.netlify.com/) from this GitHub repo.

## Running the app locally

There's a running version of this app deployed [here on Netlify](https://slash-graphql-todos.netlify.app/).  You can use that version to sign-up and make task lists. 

If you want to build your own version of this app, then follow along on one of the blog post ([here](https://github.com/dgraph-io/tudo-tutorial/tree/get-started-blog) and here) to learn how to build and deploy your own GraphQL database with Slash GraphQL.

However, if you just want to run something, then there is a Slash GraphQL backend at `https://murky-cattle.us-west-2.aws.cloud.dgraph.io` that's serving the Netlify version of this app.  The `.env` file already points to that as the GraphQL backend, so you can do a local build of the UI and run the app locally with

```
npm install
npm start
```

## Dependencies

The UI is vanilla React JS with Apollo client, and the neat [React-TodoMVC](https://github.com/sw-yx/react-todomvc) component.
