import { Node, NodeList, XMLSerializer } from './index'
import { ERR } from '../util'
import { initElement, getAttributeNames, getAttribute, setAttribute, removeAttribute, matches } from './Document'
import { parseFragment } from './DOMParser'

export abstract class Element extends Node implements globalThis.Element {
  abstract readonly tagName: string
  readonly childNodes = new NodeList<ChildNode>()
  #localName: string
  #classList

  constructor(doc = document, localName: string = ERR('new Element() is not supported')) {
    super(doc)

    this.#localName = localName

    initElement(doc, this, localName)
  }

  get nodeType() {
    return Node.ELEMENT_NODE
  }

  get nodeName() {
    return this.tagName
  }

  get localName() {
    return this.#localName
  }

  /** @deprecated */
  get attributes(): any {
    // preact needs this
    // otherwise we really don't want to support Attr & NamedNodeMap because
    // it would only make everything much more complex with no real benefit
    // if we'll ever need it, it should be lazy-created weak-stored proxy
    // and it should still delegate to el.get/setAttribute()
    return this.getAttributeNames().map(name => ({ name, value: this.getAttribute(name) }))
  }

  getAttribute(name: string): string | null {
    return getAttribute(this.ownerDocument, this, name)
  }

  getAttributeNames(): string[] {
    return getAttributeNames(this.ownerDocument, this)
  }

  hasAttribute(name: string): boolean {
    return this.getAttribute(name) !== null
  }

  hasAttributes(): boolean {
    return !!this.getAttributeNames().length
  }

  setAttribute(name: string, value: string) {
    value = (typeof value === 'string' ? value : '' + value).toLowerCase()

    setAttribute(this.ownerDocument, this, name, value)
  }

  removeAttribute(name: string) {
    removeAttribute(this.ownerDocument, this, name)
  }

  toggleAttribute(name: string, force?: boolean): boolean {
    if (this.hasAttribute(name)) {
      if (force) {
        return true
      }

      this.removeAttribute(name)
      return false
    }

    if (!force && force !== undefined) {
      return false
    }

    this.setAttribute(name, '')
    return true
  }

  get id() {
    return this.getAttribute('id') ?? ''
  }

  set id(id: string) {
    this.setAttribute('id', id)
  }

  get className() {
    return this.getAttribute('class') ?? ''
  }

  set className(className: string) {
    this.setAttribute('class', className)
  }

  get innerText() {
    return this.textContent!
  }

  set innerText(innerText) {
    this.textContent = innerText
  }

  get innerHTML() {
    const s = new XMLSerializer()

    return this.childNodes.map(n => s.serializeToString(n)).join('')
  }

  set innerHTML(html) {
    this.childNodes.forEach(n => this.removeChild(n))

    const f = parseFragment(this.ownerDocument, html)
    this.append(f)
  }

  get outerHTML() {
    return new XMLSerializer().serializeToString(this)
  }

  set outerHTML(html) {
    this.replaceWith(parseFragment(this.ownerDocument, html))
  }

  matches(sel: string): boolean {
    return matches(document, this, sel)
  }

  get classList() {
    if (this.#classList === undefined) {
      this.#classList = createClassList(this)
    }

    return this.#classList
  }

  // later
  scrollLeft
  scrollTop
  getBoundingClientRect

  // maybe later
  animate
  assignedSlot
  attachShadow
  clientHeight
  clientLeft
  clientTop
  clientWidth
  closest
  getAnimations
  getAttributeNode
  getAttributeNodeNS
  getAttributeNS
  getClientRects
  hasAttributeNS
  hasPointerCapture
  insertAdjacentElement
  insertAdjacentHTML
  insertAdjacentText
  msGetRegionContent
  prefix
  releasePointerCapture
  removeAttributeNode
  removeAttributeNS
  requestFullscreen
  requestPointerLock
  scroll
  scrollBy
  scrollHeight
  scrollIntoView
  scrollTo
  scrollWidth
  setAttributeNode
  setAttributeNodeNS
  setAttributeNS
  setPointerCapture
  shadowRoot
  slot

  // ignore vendor
  webkitMatchesSelector
}

function createClassList(el): DOMTokenList {
  const getTokens = () => el.className.split(/\s+/g)
  const setTokens = tokens => (el.className = tokens.join(' '))

  const classList = {
    supports: token => true,
    item: i => getTokens()[i],
    contains: token => getTokens().includes(token),
    forEach: (cb, thisArg) => getTokens().forEach(cb, thisArg),

    add: (...tokens) => setTokens([...new Set([...getTokens(), ...tokens])]),
    remove: (...tokens) => setTokens(getTokens().filter(t => !tokens.includes(t))),
    replace: (token, newToken) => setTokens(getTokens().map(t => (t === token ? newToken : t))),
    toggle: (token, force = getTokens().includes(token)) => classList[force ? 'add' : 'remove'](token),

    get value() {
      return el.className
    },

    set value(v) {
      el.className = v
    },

    get length() {
      return getTokens().length
    },
  }

  return classList
}
