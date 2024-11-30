/* eslint no-undef:off */

importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js')

self.onmessage = async (e) => {
  e = e.data
  // Load Pyodide
  if (!self.pyodide) {
    console.log('loading')
    self.pyodide = await loadPyodide()
  }

  try {
  // Run Python code sent from the main thread
    switch (e.type) {
      case 'runCode':
        self.postMessage({ success: true, result: await self.pyodide.runPython(e.code) })
        break
      case 'getOutput':
        self.postMessage({ success: true, output: await self.pyodide.runPython('sys.stdout.getvalue()') })
        break
      case 'writeFile':
        await self.pyodide.FS.writeFile(e.fileName, e.input)
        self.postMessage({ success: true, loadedFile: e.fileName })
        break
      case 'readFile':
        self.postMessage({ success: true, file: e.encoding ? self.pyodide.FS.readFile(e.fileName, { encoding: e.encoding }) : await self.pyodide.FS.readFile(e.fileName) })
        break
      case 'analyzePath':
        self.postMessage({ success: true, exists: await self.pyodide.FS.analyzePath(e.fileName).exists })
        break
      case 'readdir':
        self.postMessage({ success: true, dir: await self.pyodide.FS.readdir(e.dir) })
        break
      case 'cwd':
        self.postMessage({ success: true, cwd: await self.pyodide.FS.cwd() })
        break
      default:
        self.postMessage({ success: false, error: 'Unknown command type: ' + e.type })
        break
    }
  } catch (error) {
    self.postMessage({ success: false, error: error.message })
  }
}
