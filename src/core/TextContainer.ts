import * as yoga from 'yoga-layout'
import { Container } from './types'
import { remove } from './utils'
import { TextPart, ResourceManager } from '.'
import { TEXT_STACKING_CONTEXT, POP_STACKING_CONTEXT } from './Window'

export class TextContainer implements Container<TextPart> {
  yogaNode = yoga.Node.create()
  children = []
  content
  breaks
  fontInstanceKey
  lineHeight
  color
  brush
  glyphs = []
  contentWidth
  contentHeight

  constructor() {
    this.yogaNode.setMeasureFunc(((width) => {
      this.updateGlyphs(width)

      return { width: this.contentWidth, height: this.contentHeight }
    }) as any)
  }

  appendChild(child) {
    this.children.push(child)
    child.textContainer = this
    this.updateContent()
  }

  insertBefore(child, before) {
    this.children.splice(this.children.indexOf(before), 0, child)
    child.textContainer = this
    this.updateContent()
  }

  removeChild(child) {
    remove(this.children, child)
    child.textContainer = undefined
    this.updateContent()
  }

  update({ fontInstanceKey = [1, 2], color, lineHeight }) {
    this.fontInstanceKey = fontInstanceKey
    this.color = color
    this.lineHeight = lineHeight

    this.updateBrush()
  }

  updateContent() {
    this.content = this.children.map(c => c.value).join('')
    this.breaks = parseBreaks(this.content)
    this.yogaNode.markDirty()
  }

  updateBrush() {
    this.brush = [ResourceManager.createBucket({
      Text: [{
        font_key: this.fontInstanceKey,
        color: this.color
      }, this.glyphs]
    })]
  }

  updateGlyphs(maxWidth) {
    const [indices, advances] = ResourceManager.getGlyphIndicesAndAdvances(this.content)
    let x = 0
    const xs = [0, ...advances.map(a => x += a)]

    const lines = []

    // do the word-wrap and figure out "line slices"
    {
      let tokenStart = 0
      let lineStart = tokenStart
      let nextBreak = maxWidth

      for (const tokenEnd of this.breaks) {
        const ch = this.content[tokenStart]

        if (ch === ' ') {
          tokenStart = tokenEnd
          continue
        }

        if (ch === '\n') {
          lines.push([lineStart, tokenStart])
          lineStart = tokenEnd
          tokenStart = tokenEnd
          nextBreak = xs[tokenEnd] + maxWidth
          continue
        }

        // not exactly (glyph can be shorter than its advance) but it's probably not worth memory and cpu
        if (xs[tokenEnd] > nextBreak) {
          lines.push([lineStart, tokenStart])
          lineStart = tokenStart
          nextBreak = xs[tokenStart] + maxWidth
        }

        // after last wrap check
        if (tokenEnd === this.content.length) {
          lines.push([lineStart, this.content.length])
          break;
        }

        tokenStart = tokenEnd
      }
    }

    const glyphs = []

    // layout lines
    for (const [lineIndex, [start, end]] of lines.entries()) {
      // TODO: text-align
      let x = 0

      // TODO: font metrics
      let y = this.lineHeight * (lineIndex + 0.7)

      for (let i = start; i < end; i++) {
        glyphs.push([indices[i], [x, y]])
        x += advances[i]
      }
    }

    // finish
    this.glyphs = glyphs
    this.contentWidth = lines.length ?xs[lines[0][1]] :200
    this.contentHeight = lines.length * this.lineHeight

    this.updateBrush()
  }

  write(drawBrush, x, y) {
    const { left, top, width, height } = this.yogaNode.getComputedLayout()
    const rect = [left + x, top + y, width, height]

    // TODO: we don't have proper font-metrics yet so we need to extend the box for now
    rect[3] += this.lineHeight

    drawBrush(TEXT_STACKING_CONTEXT, rect)
    drawBrush(this.brush, [0, 0, rect[2], rect[3]])
    drawBrush(POP_STACKING_CONTEXT, [0, 0, rect[2], rect[3]])
  }
}

const TOKEN_REGEX = /[^\n ]+|\n| +/g

const parseBreaks = (str) => {
  if (str === '') {
    return []
  }

  let i = 0

  return str.match(TOKEN_REGEX).map(t => i += t.length)
}

export default TextContainer