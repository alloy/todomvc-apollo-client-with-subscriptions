import React from "react"
import { useQuery, useMutation, gql } from "@apollo/client"
import { Todos } from "react-todomvc"

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
          owner: { username: "Anonymous" },
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
    </div>
  )
}

export default App
