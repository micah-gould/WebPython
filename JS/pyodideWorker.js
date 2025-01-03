/* eslint no-undef:off */

importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js')

self.onmessage = async (e) => {
  e = e.data
  // Load Pyodide
  if (!self.pyodide) {
    self.pyodide = await loadPyodide()
  }

  try {
  // Run Python code sent from the main thread
    switch (e.type) {
      case 'setup':
        await self.pyodide.runPython(`
          import sys
          import io
          sys.stdout = io.StringIO()
          sys.stderr = io.StringIO()
          `) // Capture the Pyodide output
        await self.pyodide.loadPackage('pillow')
        self.postMessage({ success: true, endTime: Date.now() })
        break
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
        self.postMessage({ success: true, file: e.encoding ? await self.pyodide.FS.readFile(e.fileName, { encoding: e.encoding }) : await self.pyodide.FS.readFile(e.fileName) })
        break
      case 'analyzePath':
        self.postMessage({ success: true, exists: (await self.pyodide.FS.analyzePath(e.fileName)).exists })
        break
      case 'readcwd':
        self.postMessage({ success: true, files: (await self.pyodide.FS.readdir(await self.pyodide.FS.cwd())).filter(file => file !== '.' && file !== '..') })
        break
      default:
        self.postMessage({ success: false, error: 'Unknown command type: ' + e.type })
        break
    }
  } catch (error) {
    self.postMessage({ success: false, error: error.message })
  }
}
