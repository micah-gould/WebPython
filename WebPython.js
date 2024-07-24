window.onload = async () => {
  const START = Date.now()
  const pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/'
  })
  const END = Date.now()
  document.getElementById('output').value = `Pyodide loaded in ${END - START}ms`
  document.getElementById('run').onclick = async () => {
    document.getElementById('output').value = ''
    const code = document.getElementById('input').value
    pyodide.runPython(`
    import sys
    import io
    sys.stdout = io.StringIO()
    `)
    pyodide.runPython(code)
    const stdout = pyodide.runPython('sys.stdout.getvalue()')
    document.getElementById('output').value = stdout
  }
}
