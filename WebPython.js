window.onload = async () => {
  const START = Date.now()
  const pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/'
  })
  const END = Date.now()
  out(`Pyodide loaded in ${END - START}ms`)
  document.getElementById('run').onclick = async () => {
    const code = 'a = 2 \nb = 2 \nc=a+b \nc'
    out('>>> ' + code)
    out(pyodide.runPython(code))
  }
  function out (str) {
    const output = document.getElementById('output')
    output.value += str + '\n'
  }
}
