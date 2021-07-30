/**
 * Taken and adjusted from https://github.com/bluedusk/todomvc-apollo
 */

const { ApolloServer, gql } = require("apollo-server-express");
const { PubSub, withFilter } = require('graphql-subscriptions');

const express = require("express");
const cors = require("cors");
const { createServer } = require('http');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const pubsub = new PubSub();
const TODO_ADDED = "TODO_ADDED";
const TODO_CHANGED = "TODO_CHANGED";

const doPublish = (todos) => {
  pubsub.publish(TODO_CHANGED, { todos });
};

const typeDefs = gql`
  type Query {
    todos: [TODO!]!
  }
  type TODO {
    id: ID!
    value: String!
    completed: Boolean!
  }
  type Mutation {
    addTodo(value: String!): TODO!
    updateTodo(id: ID!, completed: Boolean!): TODO!
    deleteTodo(id: ID!): TODO
    completeAll: Boolean
    deleteCompleted: [TODO!]!
  }
  type Subscription {
    todoAdded: TODO
    todoUpdated: TODO!
    todoDeleted: TODO!
  }
`;

const resolvers = {
  Query: {
    todos: (parent, args, { Todos }) => {
      return Todos.getTodos();
    },
  },
  Mutation: {
    addTodo: (_, { value }, { Todos }) => {
      const todoAdded = Todos.addTodo(value);
      pubsub.publish(TODO_ADDED, { todoAdded })
      return todoAdded;
    },
    deleteTodo: (_, { id }, { Todos }) => {
      const result = Todos.deleteTodo(id);
      doPublish(Todos.getTodos());
      return result;
    },
    updateTodo: (_, { id, completed }, { Todos }) => {
      const result = Todos.updateTodoById(id, completed);
      doPublish(Todos.getTodos());
      return result;
    },
    deleteCompleted: (_, __, { Todos }) => {
      const completed = Todos.deleteCompleted();
      doPublish(Todos.getTodos());
      return completed;
    },
  },
  Subscription: {
    todoAdded: {
      subscribe: async () => {
        return withFilter(pubsub.asyncIterator(TODO_ADDED), todoAdded => {
          console.log({ todoAdded })
          return true
        });
      }
    }
  },
}

/**
 * A mock datasource providing todo CRUD functionalities
 */
class Todos {
  constructor() {
    this.id = 0;
    this.todos = [
      {
        id: this.id++,
        value: "Finish T2",
        completed: false,
      },
      {
        id: this.id++,
        value: "Beat US women soccer team",
        completed: true
      }
    ];
  }

  getTodos() {
    return this.todos;
  }

  setTodos(todos) {
    this.todos = todos;
  }

  addTodo(todoText, completed = false) {
    const todo = {
      id: String(this.id++),
      value: todoText,
      completed,
    };
    this.todos.push(todo);
    return todo;
  }

  deleteTodo(id) {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      this.todos = this.todos.filter((todo) => todo.id !== id);
    }
    return todo;
  }

  updateTodoById(id, completed) {
    let result;
    this.todos.forEach((todo) => {
      if (todo.id === id) {
        todo.completed = completed;
      }
      result = todo;
    });

    return result;
  }
  deleteAll() {
    this.todos = [];
  }
  deleteCompleted() {
    const completed = this.todos.filter(({ completed }) => completed);
    this.todos = this.todos.filter(({ completed }) => !completed);
    return completed;
  }
  completeAll() {
    this.todos = [...this.todos].map((todo) => {
      return {
        ...todo,
        completed: true,
      };
    });
  }
}

(async () => {
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const app = express();
  app.use(cors());
  const httpServer = createServer(app);

  // The ApolloServer constructor requires two parameters: your schema
  // definition and your set of resolvers.
  const server = new ApolloServer({
    schema,
    // context: Where we "inject" our fake datasource
    context: {
      Todos: new Todos(),
    },
    // plugins(optional): A small plugin to print log when server receives request
    // More on plugins: https://www.apollographql.com/docs/apollo-server/integrations/plugins/
    plugins: [
      {
        requestDidStart(requestContext) {
          console.log(
            `[${new Date().toISOString()}] - Graphql operationName:  ${requestContext.request.operationName
            }`
          );
        },
      },
    ],
    // capture errors
    formatError: (err) => {
      console.log(err);
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  const subscriptionServer = SubscriptionServer.create({
    // This is the `schema` we just created.
    schema,
    // These are imported from `graphql`.
    execute,
    subscribe,
  }, {
    // This is the `httpServer` we created in a previous step.
    server: httpServer,
    // This `server` is the instance returned from `new ApolloServer`.
    path: server.graphqlPath,
  });

  // Shut down in the case of interrupt and termination signals
  // We expect to handle this more cleanly in the future. See (#5074)[https://github.com/apollographql/apollo-server/issues/5074] for reference.
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => subscriptionServer.close());
  });

  // The `listen` method launches a web server at localhost:4000.
  httpServer.listen(4000)
  // console.log(`🚀 Server ready at ${url}`);
  // console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);
})();