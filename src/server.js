/**
 * Taken and adjusted from https://github.com/bluedusk/todomvc-apollo
 */

const { PubSub } = require('graphql-subscriptions');
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const cors = require("cors");
const { createServer } = require('http');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const dedent = require("dedent");

const pubsub = new PubSub();
const TODO_ADDED = "TODO_ADDED";
const TODO_UPDATED = "TODO_UPDATED";

// A noop function that will allow us to syntax highlight GraphQL documents.
function gql(template) {
  return dedent(template);
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
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = completed;
    }
    return todo;
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
      // doPublish(Todos.getTodos());
      return result;
    },
    updateTodo: (_, { id, completed }, { Todos }) => {
      const todoUpdated = Todos.updateTodoById(id, completed);
      if (todoUpdated) {
        pubsub.publish(TODO_UPDATED, { todoUpdated })
      }
      return todoUpdated;
    },
    deleteCompleted: (_, __, { Todos }) => {
      const completed = Todos.deleteCompleted();
      // doPublish(Todos.getTodos());
      return completed;
    },
  },
  Subscription: {
    todoAdded: {
      subscribe: () => pubsub.asyncIterator(TODO_ADDED)
    },
    todoUpdated: {
      subscribe: () => pubsub.asyncIterator(TODO_UPDATED)
    }
  },
}

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(cors());
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    context: { Todos: new Todos() },
    graphiql: {
      subscriptionEndpoint: "ws://localhost:4000/subscriptions",
      defaultQuery: gql`
        query ToDosQuery {
          toDos {
            __typename
            id
            title
          }
        }

        # mutation CreateToDoMutation($title: String) {
        #   createToDo(title: $title) {
        #     __typename
        #     title
        #     id
        #   }
        # }

        # subscription ToDoCreatedSubscription {
        #   toDoCreated {
        #     __typename
        #     id
        #     title
        #   }
        # }
      `,
    },
  })
);

const server = createServer(app);
server.listen(4000, () => {
  console.log(`🚀 GraphQL server is now running at http://localhost:4000`);

  // Set up the WebSocket for handling GraphQL subscriptions.
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
    },
    {
      server,
      path: "/subscriptions",
    }
  );
});
