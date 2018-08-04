/** @jsx h */

const { h, app } = vDom

const state = { count: 0 }
const setCount = (count) => ({ count })

const view = (state) =>
  <div>
    <span>{state.count}</span>
    <button onClick={() => setCount(state.count + 1)}>+</button>
  </div>

app(state, view, document.getElementById('root'))
