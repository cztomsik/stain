import htm from 'htm'
import { Node, NodeList } from './index'
import { ERR } from '../util'
import { XMLSerializer } from '../dom/XMLSerializer'
import { GET_THE_PARENT } from '../events/EventTarget'
import { initElement, removeAttribute, setAttribute } from './Document'

export abstract class Element extends Node implements globalThis.Element {
  abstract readonly tagName: string
  readonly childNodes = new NodeList<ChildNode>()
  #localName: string
  #attributes = new Map<string, string>()

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
    return Array.from(this.#attributes).map(([name, value]) => ({ name, value }))
  }

  getAttribute(name: string): string | null {
    return this.#attributes.get(name) ?? null
  }

  getAttributeNames(): string[] {
    return [...this.#attributes.keys()]
  }

  hasAttribute(name: string): boolean {
    return this.#attributes.has(name)
  }

  hasAttributes(): boolean {
    return !!this.getAttributeNames().length
  }

  setAttribute(name: string, value: string) {
    this.#attributes.set(name, value)

    setAttribute(this.ownerDocument, this, name, value)
  }

  removeAttribute(name: string) {
    this.#attributes.delete(name)

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

  // so the events can bubble
  // @see EventTarget
  [GET_THE_PARENT]() {
    return this.parentElement as any
  }

  get innerHTML() {
    const s = new XMLSerializer()

    return this.childNodes.map(n => s.serializeToString(n)).join()
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

  // later
  scrollLeft
  scrollTop
  getBoundingClientRect

  // maybe later
  animate
  assignedSlot
  attachShadow
  classList
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
  getElementsByTagNameNS
  getElementsByTagName
  getElementsByClassName
  hasAttributeNS
  hasPointerCapture
  insertAdjacentElement
  insertAdjacentHTML
  insertAdjacentText
  matches
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

// TODO: move to document?
// TODO: real parser
export const parseFragment = (doc, html) => {
  const fr = doc.createDocumentFragment()

  // add `/` for void elements
  // we don't need to wrap tr/td/... because we don't forbid what can be inserted
  // (and we don't auto-insert anything which should be fine because most frameworks do that for us)
  html = html.replace(
    /<(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)([^<>]*?)\/?>/gi,
    '<$1$2/>'
  )

  const createElement = (tag, atts, ...childNodes) => {
    const el = doc.createElement(tag)

    Object.entries(atts ?? {}).forEach(([att, v]) => el.setAttribute(att, v))
    el.append(...childNodes)

    return el
  }

  // node, array of nodes or undefined (for empty string)
  const nodes = htm.bind(createElement)([html]) ?? []

  fr.append(...[].concat(nodes))

  return fr
}
