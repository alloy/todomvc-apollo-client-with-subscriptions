/**
 * Taken and adjusted from https://github.com/bluedusk/todomvc-apollo
 */

const { ApolloServer, gql } = require("apollo-server");
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();
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
    todos: [TODO!]!
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
      const result = Todos.addTodo(value);
      doPublish(Todos.getTodos());
      return result;
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
    todos: {
      subscribe: () => {
        return pubsub.asyncIterator([TODO_CHANGED]);
      },
    },
  },
}

/**
 * A mock datasource providing todo CRUD functionalities
 */
class Todos {
  constructor() {
    this.id = 0;
    this.todos = [];
    this.addTodo("Finish T2");
    this.addTodo("Beat US women soccer team", true)
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

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
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

// The `listen` method launches a web server at localhost:4000.
server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`🚀 Server ready at ${url}`);
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);
});