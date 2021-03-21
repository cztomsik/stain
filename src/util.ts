export const assert = (value, msg) => value || ERR(msg)

export const NOOP = () => {}
export const ERR = (...msgs): any => {
  throw new Error(msgs.join(' '))
}
export const TODO = () => ERR('TODO')
export const UNSUPPORTED = () => ERR('UNSUPPORTED')
export const UNREACHABLE = () => ERR('UNREACHABLE')

export const last = arr => arr[arr.length - 1]

export const LITTLE_ENDIAN = (() => {
  let b = new ArrayBuffer(2)
  new DataView(b).setInt16(0, 256, true)
  return new Int16Array(b)[0] === 256
})()

export const camelCase = name => name.replace(/\-[a-zA-Z]/g, match => match.slice(1).toUpperCase())
export const kebabCase = name => name.replace(/[A-Z]/g, match => '-' + match.toLowerCase())
export const pascalCase = name => ((name = camelCase(name)), name[0].toUpperCase() + name.slice(1))

export const readTextFile =
  globalThis.Deno?.readTextFile ??
  (async path => {
    const fs = await import('fs/promises')
    return fs.readFile(path, 'utf-8')
  })

export async function readURL(url) {
  url = new URL(url)

  if (url.protocol === 'data:') {
    return TODO()
  }

  if (url.protocol === 'file:') {
    return readTextFile(url.pathname)
  }

  if (url.protocol.match(/^https?:$/)) {
    return fetch(url).then(res => res.text())
  }

  return UNSUPPORTED()
}
