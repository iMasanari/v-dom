/** @jsx h */

const { h, app } = vDom

const state = { count: 0 }
const setCount = (count) => ({ count })

const Counter = (props) =>
  (state) =>
    <div>
      <span>{state.count}</span>
      <button onClick={() => setCount(state.count + props.by)}>+</button>
    </div>

const view = () =>
  <div>
    <h1>Counter Sample</h1>
    <Counter by={1} />
  </div>

app(state, view, document.getElementById('root'), (action, setState) => {
  console.log(action)
  setState((state) => ({ ...state, ...action }))
})
