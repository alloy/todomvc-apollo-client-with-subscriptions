import React from "react"
import { useQuery, useMutation, gql, useSubscription } from "@apollo/client"
import { Todos } from "react-todomvc"

import "react-todomvc/dist/todomvc.css"

const GET_TODOS = gql`
  query AllTodosQuery {
    todos {
      id
      value
      completed
    }
  }
`

const ADD_TODO = gql`
  mutation AddTodoMutation($value: String!) {
    addTodo(value: $value) {
      id
      value
      completed
    }
  }
`

const UPDATE_TODO = gql`
  mutation UpdateTodoMutation($id: ID!, $completed: Boolean!) {
    updateTodo(id: $id, completed: $completed) {
      id
      completed
    }
  }
`

const DELETE_TODO = gql`
  mutation DeleteTodoMutation($id: ID!) {
    deleteTodo(id: $id) {
      id
    }
  }
`

const CLEAR_COMPLETED_TODOS = gql`
  mutation ClearCompletedTodosMutation {
    deleteCompleted {
      id
    }
  }
`

const TODO_ADDED_SUBSCRIPTION = gql`
  subscription TodoAddedSubscription {
    todoAdded {
      id
      value
      completed
    }
  }
`

const TODO_UPDATED_SUBSCRIPTION = gql`
  subscription TodoUpdatedSubscription {
    todoUpdated {
      id
      value
      completed
    }
  }
`

const TODO_DELETED_SUBSCRIPTION = gql`
  subscription TodoDeletedSubscription {
    todoDeleted {
      id
    }
  }
`

function App() {
  const { loading, error, data } = useQuery(GET_TODOS)
  const [add] = useMutation(ADD_TODO)
  const [del] = useMutation(DELETE_TODO)
  const [upd] = useMutation(UPDATE_TODO)
  const [clear] = useMutation(CLEAR_COMPLETED_TODOS)

  useSubscription(TODO_UPDATED_SUBSCRIPTION, {
    // Explicitly update the store when a todo has been added.
    // This is unnecessary in case of following the Global Object Identification spec.
    onSubscriptionData: ({ client: { cache }, subscriptionData }) => {
      if (subscriptionData.error) {
        console.error(subscriptionData.error)
      } else {
        const todoUpdated = subscriptionData.data.todoUpdated;
        cache.modify({
          id: cache.identify(todoUpdated),
          fields: {
            value: () => todoUpdated.value,
            completed: () => todoUpdated.completed,
          },
        })
      }
    }
  })

  // Add to list
  useSubscription(TODO_ADDED_SUBSCRIPTION, {
    onSubscriptionData: ({ client: { cache }, subscriptionData }) => {
      if (subscriptionData.error) {
        console.error(subscriptionData.error)
      } else {
        const todoAdded = subscriptionData.data.todoAdded;
        const allTodosQuery = cache.readQuery({ query: GET_TODOS })
        // If we don't already have this TODO (eg local mutation)...
        if (!allTodosQuery.todos.find(todo => todo.id === todoAdded.id)) {
          // ...append it to the end of the existing list.
          cache.writeQuery({
            query: GET_TODOS,
            data: {
              todos: [...allTodosQuery.todos, todoAdded],
            },
          })
        }
      }
    }
  })

  // Remove from list
  useSubscription(TODO_DELETED_SUBSCRIPTION, {
    onSubscriptionData: ({ client: { cache }, subscriptionData }) => {
      if (subscriptionData.error) {
        console.error(subscriptionData.error)
      } else {
        const todoDeleted = subscriptionData.data.todoDeleted;
        cache.evict({ id: cache.identify(todoDeleted) })
      }
    }
  })

  if (loading) {
    return <p>Loading</p>
  }
  if (error) {
    return <p>`Error: ${error.message}`</p>
  }

  const addNewTodo = (value) =>
    add({
      variables: {
        value: value,
      },
      update(cache, { data }) {
        const existing = cache.readQuery({ query: GET_TODOS })
        if (!existing.todos.find(todo => todo.id === data.addTodo.id)) {
          cache.writeQuery({
            query: GET_TODOS,
            data: {
              todos: [...existing.todos, data.addTodo],
            },
          })
        }
      },
    })

  const updateTodo = (modifiedTodo) =>
    upd({
      variables: {
        id: modifiedTodo.id,
        completed: modifiedTodo.completed,
      },
      // Explicitly update the store with the updated completion status.
      // This is unnecessary in case of following the Global Object Identification spec.
      update(cache, { data }) {
        cache.modify({
          id: cache.identify(data.updateTodo),
          fields: {
            value: () => data.updateTodo.value,
            completed: () => data.updateTodo.completed,
          },
        })
      },
    })

  const deleteTodo = (id) =>
    del({
      variables: { id },
      update(cache, { data }) {
        cache.evict({ id: cache.identify(data.deleteTodo) })
      },
    })

  const clearCompletedTodos = () =>
    clear({
      update(cache, { data }) {
        data.deleteCompleted.forEach(todo => {
          cache.evict({ id: cache.identify(todo) })
        })
      },
    })

  return (
    <div>
      <Todos
        todos={data.todos}
        addNewTodo={addNewTodo}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
        clearCompletedTodos={clearCompletedTodos}
        todosTitle="GraphQL Todos"
      />
    </div>
  )
}

export default App
