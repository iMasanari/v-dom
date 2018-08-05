declare global {
  namespace JSX {
    interface Element extends VNode<any> { }
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

type ResolvedNode<P = object> = VNode<P> | TextNode
type HTMLNode<P = object> = ResolvedNode<P> | ((state: any) => HTMLNode<P>)

export interface VNode<P = object> {
  type: string
  props: P
  children: ResolvedNode[]
}

export type TextNode = string & {
  [P in keyof VNode]?: undefined
}

export interface Component<P = object> {
  (props: P, children: ResolvedNode[]): VNode<P>
}

function isTextNode(node: ResolvedNode): node is TextNode {
  return !node.type
}

export function h<P>(type: string | Component<P>, props?: P, ...children: ResolvedNode[]): HTMLNode {
  return typeof type === 'function' ? type(props || {} as P, children) : {
    type,
    props: props || {},
    children: children.filter((child) => child != null && child !== ''),
  }
}

function resolveNode(node: HTMLNode, store: Store<any>): ResolvedNode {
  return typeof node === 'function' ? resolveNode(node(store.state), store) : node
}

function setBooleanProp($target: Element, name: string, value: boolean) {
  if (value) {
    $target.setAttribute(name, value as any)
  }
  ($target as any)[name] = value
}

function removeBooleanProp($target: Element, name: string) {
  $target.removeAttribute(name);
  ($target as any)[name] = false
}

function isEventProp(name: string) {
  return /^on/.test(name)
}

function extractEventName(name: string) {
  return name.slice(2).toLowerCase()
}

function setProp($target: Element, name: string, value: any) {
  if (name === 'className') {
    $target.setAttribute('class', value)
  }
  else if (typeof value === 'boolean') {
    setBooleanProp($target, name, value)
  }
  else {
    $target.setAttribute(name, value)
  }
}

function removeProp($target: Element, name: string, value: any) {
  if (name === 'className') {
    $target.removeAttribute('class')
  }
  else if (typeof value === 'boolean') {
    removeBooleanProp($target, name)
  }
  else {
    $target.removeAttribute(name)
  }
}

type ElementWithEvent = Element & { events?: Record<string, any> }

function setEvent($target: ElementWithEvent, dispatch: Dispatch, name: string, newVal: any, oldVal?: any) {
  const event = extractEventName(name)

  if ($target.events) {
    if (!oldVal) oldVal = $target.events[event]
  } else {
    $target.events = {}
  }

  $target.events[event] = newVal

  if (newVal) {
    if (!oldVal) {
      $target.addEventListener(event, dispatch)
    }
  } else {
    $target.removeEventListener(event, dispatch)
  }
}

function updateProp($target: Element, dispatch: Dispatch, name: string, newVal: any, oldVal: any) {
  if (isEventProp(name)) {
    setEvent($target, dispatch, name, newVal, oldVal)
  }
  else if (newVal == null) {
    removeProp($target, name, oldVal)
  }
  else if (oldVal == null || newVal !== oldVal) {
    setProp($target, name, newVal)
  }
}

function updateProps($target: Element, dispatch: Dispatch, newProps: any, oldProps: any = {}) {
  Object.keys({ ...newProps, ...oldProps }).forEach(name => {
    updateProp($target, dispatch, name, newProps[name], oldProps[name])
  })
}

function createElement(node: ResolvedNode, store: Store<any>) {
  if (isTextNode(node)) {
    return document.createTextNode(node)
  }

  const $el = document.createElement(node.type)
  updateProps($el, store.dispatch, node.props)

  for (let i = 0, len = node.children.length; i < len; ++i) {
    $el.appendChild(createElement(
      node.children[i] = resolveNode(node.children[i], store),
      store
    ))
  }

  return $el
}

function changed(node1: ResolvedNode, node2: ResolvedNode) {
  return typeof node1 !== typeof node2 ||
    isTextNode(node1) && node1 !== node2 ||
    node1.type !== node2.type
}

function updateElement($parent: Element, store: Store<any>, newNode: ResolvedNode, oldNode?: ResolvedNode, index = 0) {
  if (oldNode == null) {
    $parent.appendChild(createElement(newNode, store))
  }
  else if (newNode == null) {
    $parent.removeChild($parent.childNodes[index])
  }
  else if (changed(newNode, oldNode)) {
    $parent.replaceChild(createElement(newNode, store), $parent.childNodes[index])
  }
  else if (!isTextNode(newNode)) {
    updateProps($parent.childNodes[index] as Element, store.dispatch, newNode.props, oldNode.props)

    const newLength = newNode.children.length
    const oldLength = oldNode.children!.length

    for (let i = 0; i < newLength || i < oldLength; i++) {
      updateElement(
        $parent.childNodes[index] as Element,
        store,
        newNode.children[i] = resolveNode(newNode.children[i], store),
        oldNode.children![i],
        i
      )
    }
  }
}

type Dispatch = (event: Event) => void

interface Store<S> {
  dispatch: Dispatch
  state: S
}

export function app<S extends object>(state: S, view: () => VNode<S>, container: Element) {
  let store: Store<S> = {
    state,
    dispatch: (event: Event) => {
      store.state = {
        ...store.state as any,
        ...(event.currentTarget as ElementWithEvent).events![event.type](event)
      }
      const node = resolveNode(h(view), store)
      updateElement(container, store, node, currentNode)
      currentNode = node
    }
  }

  let currentNode = resolveNode(h(view), store)

  updateElement(container, store, currentNode)
}
