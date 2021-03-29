import { App, AppWindow, WebView } from '../lib/index.js'

console.log(`
  Note that this example requires some setup first:
  https://web-platform-tests.org/running-tests/from-local-system.html

  and it's currently only supported in deno
`)

const app = await App.init()
app.run()

const runner = new AppWindow()
runner.hide()

const progress = new AppWindow()
const webview = new WebView()
webview.attach(progress)
webview.loadURL(`data:text/html,${encodeURIComponent('Please wait...')}`)

// show progress
// TODO: moving mouse around will make tests run faster
//       (app.tick() blocks main process and we have lots of promises
//        using Promise.resolve() in the tick() instead of setTimeout() might resolve the issue)
setInterval(async () => {
  const html = await runner.eval('document.documentElement.innerHTML')
  webview.loadURL(`data:text/html,${encodeURIComponent(html)}`)
}, 100)

// TODO: find ../wpt | grep '\.html$' | grep '/dom/'
const urls = [
  'http://web-platform.test:8000/dom/nodes/CharacterData-data.html',
  'http://web-platform.test:8000/dom/nodes/Node-parentElement.html',
  'http://web-platform.test:8000/dom/nodes/Node-appendChild.html',
  //'http://web-platform.test:8000/dom/nodes/Node-properties.html',
  'http://web-platform.test:8000/dom/nodes/CharacterData-data.html',
  'http://web-platform.test:8000/dom/nodes/CharacterData-appendChild.html',
  //'http://web-platform.test:8000/dom/nodes/ChildNode-after.html',
  //'http://web-platform.test:8000/dom/nodes/Element-tagName.html',
  //'http://web-platform.test:8000/dom/nodes/Document-createElement.html',
  //'http://web-platform.test:8000/dom/nodes/ParentNode-querySelector-All.html',
]

for (const url of urls) {
  console.log('running', url)
  await runner.loadURL(url)

  console.log('waiting 2s')
  await new Promise(resolve => setTimeout(resolve, 2000))

  console.log(await runner.eval(`document.querySelector("#summary").textContent`))
  console.log('---')
}