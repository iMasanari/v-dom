declare global {
  namespace JSX {
    interface Element extends VNode<any> { }
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

type HTMLNode = VNode | TextNode

export interface VNode<P = object> {
  type: string
  props: P
  children: HTMLNode[]
}

export type TextNode = string & {
  [P in keyof VNode]?: undefined
}

export interface Component<P = object> {
  (props: P, children: HTMLNode[]): VNode<P>
}

function isTextNode(node: HTMLNode): node is TextNode {
  return !node.type
}

export function h<P>(type: string | Component<P>, props?: P, ...children: HTMLNode[]): VNode {
  return typeof type === 'function' ? type(props || {} as P, children) : {
    type,
    props: props || {},
    children: children.filter((child) => child != null && child !== ''),
  }
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

function createElement(node: HTMLNode, dispatch: Dispatch) {
  if (isTextNode(node)) {
    return document.createTextNode(node)
  }

  const $el = document.createElement(node.type)
  updateProps($el, dispatch, node.props)

  node.children.forEach((child) => {
    $el.appendChild(createElement(child, dispatch))
  })

  return $el
}

function changed(node1: HTMLNode, node2: HTMLNode) {
  return typeof node1 !== typeof node2 ||
    isTextNode(node1) && node1 !== node2 ||
    node1.type !== node2.type
}

function updateElement($parent: Element, dispatch: Dispatch, newNode: HTMLNode, oldNode?: HTMLNode, index = 0) {
  if (oldNode == null) {
    $parent.appendChild(createElement(newNode, dispatch))
  }
  else if (newNode == null) {
    $parent.removeChild($parent.childNodes[index])
  }
  else if (changed(newNode, oldNode)) {
    $parent.replaceChild(createElement(newNode, dispatch), $parent.childNodes[index])
  }
  else if (!isTextNode(newNode)) {
    updateProps($parent.childNodes[index] as Element, dispatch, newNode.props, oldNode.props)

    const newLength = newNode.children.length
    const oldLength = oldNode.children!.length

    for (let i = 0; i < newLength || i < oldLength; i++) {
      updateElement(
        $parent.childNodes[index] as Element,
        dispatch,
        newNode.children[i],
        oldNode.children![i],
        i
      )
    }
  }
}

type Dispatch = (event: Event) => void

export function app<S extends object>(state: S, view: (state: S) => VNode<S>, container: Element) {
  let currentState = state
  let currentNode = h(view, state)

  const dispatch: Dispatch = (event: Event) => {
    currentState = {
      ...currentState as any,
      ...(event.currentTarget as ElementWithEvent).events![event.type](event)
    }

    const node = h(view, currentState)
    updateElement(container, dispatch, node, currentNode)
    currentNode = node
  }

  updateElement(container, dispatch, currentNode)
}
