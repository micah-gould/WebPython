/* CODE TAKEN FROM CHATGPT */

/* eslint no-undef: off
    -------------
    no-undef is off because of self */

self.onmessage = async (event) => {
  const { type, data } = event.data

  if (type === 'init') {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js')
    self.pyodide = await loadPyodide()
    self.postMessage({ type: 'init', status: 'ok' })
  } else if (type === 'run') {
    try {
      const result = await self.pyodide.runPythonAsync(data)
      self.postMessage({ type: 'result', result })
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message })
    }
  }
}
