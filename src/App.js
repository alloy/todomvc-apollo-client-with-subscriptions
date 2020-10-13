import React from "react"
import { useQuery, useMutation, gql } from "@apollo/client"
import { Todos } from "react-todomvc"
import { useAuth0 } from "@auth0/auth0-react"

import "react-todomvc/dist/todomvc.css"

const GET_TODOS = gql`
  query {
    queryTodo {
      id
      value
      completed
    }
  }
`

const ADD_TODO = gql`
  mutation addTodo($todo: AddTodoInput!) {
    addTodo(input: [$todo]) {
      todo {
        id
        value
        completed
      }
    }
  }
`

const UPDATE_TODO = gql`
  mutation updateTodo($id: ID!, $todo: TodoPatch!) {
    updateTodo(input: { filter: { id: [$id] }, set: $todo }) {
      todo {
        id
        value
        completed
      }
    }
  }
`

const DELETE_TODO = gql`
  mutation deleteTodo($id: ID!) {
    deleteTodo(filter: { id: [$id] }) {
      todo {
        id
      }
    }
  }
`

const CLEAR_COMPLETED_TODOS = gql`
  mutation updateTodo {
    deleteTodo(filter: { completed: true }) {
      todo {
        id
      }
    }
  }
`

function App() {
  const { loading, error, data } = useQuery(GET_TODOS)
  const [add] = useMutation(ADD_TODO)
  const [del] = useMutation(DELETE_TODO)
  const [upd] = useMutation(UPDATE_TODO)
  const [clear] = useMutation(CLEAR_COMPLETED_TODOS)

  const {
    auth0IsLoading,
    auth0Error,
    isAuthenticated,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0()
  if (auth0IsLoading) {
    return <p>Auth0 is starting</p>
  }
  if (auth0Error) {
    return <div>Oops Auth0 didn't start: {error.message}</div>
  }

  const logInOut = !isAuthenticated ? (
    <p>
      <button onClick={loginWithRedirect}>Log in</button> to use the app.
    </p>
  ) : (
    <p>
      <button
        onClick={() => {
          logout({ returnTo: window.location.origin })
        }}
      >
        Log out
      </button>{" "}
      once you are finished, {user.email}.
    </p>
  )

  if (loading) {
    return <p>Loading</p>
  }
  if (error) {
    return <p>`Error: ${error.message}`</p>
  }

  const addNewTodo = (value) =>
    add({
      variables: {
        todo: {
          value: value,
          completed: false,
          owner: { username: user.email },
        },
      },
      update(cache, { data }) {
        const existing = cache.readQuery({ query: GET_TODOS })
        cache.writeQuery({
          query: GET_TODOS,
          data: {
            queryTodo: [
              ...(existing ? existing.queryTodo : []),
              ...data.addTodo.todo,
            ],
          },
        })
      },
    })

  const updateTodo = (modifiedTodo) =>
    upd({
      variables: {
        id: modifiedTodo.id,
        todo: {
          value: modifiedTodo.value,
          completed: modifiedTodo.completed,
        },
      },
      update(cache, { data }) {
        data.updateTodo.todo.map((t) =>
          cache.modify({
            id: cache.identify(t),
            fields: {
              value: () => t.value,
              completed: () => t.completed,
            },
          })
        )
      },
    })

  const deleteTodo = (id) =>
    del({
      variables: { id },
      update(cache, { data }) {
        data.deleteTodo.todo.map((t) => cache.evict({ id: cache.identify(t) }))
      },
    })

  const clearCompletedTodos = () =>
    clear({
      update(cache, { data }) {
        data.deleteTodo.todo.map((t) => cache.evict({ id: cache.identify(t) }))
      },
    })

  return (
    <div>
      <Todos
        todos={data.queryTodo}
        addNewTodo={addNewTodo}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
        clearCompletedTodos={clearCompletedTodos}
        todosTitle="GraphQL Todos"
      />
      {logInOut}
    </div>
  )
}

export default App
