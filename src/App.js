import React from "react"
import { useQuery, useMutation, gql } from "@apollo/client"
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
        value: value,
      },
      update(cache, { data }) {
        const existing = cache.readQuery({ query: GET_TODOS })
        cache.writeQuery({
          query: GET_TODOS,
          data: {
            todos: [
              ...(existing ? existing.todos : []),
              data.addTodo,
            ],
          },
        })
      },
    })

  const updateTodo = (modifiedTodo) =>
    upd({
      variables: {
        id: modifiedTodo.id,
        completed: modifiedTodo.completed,
      },
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
