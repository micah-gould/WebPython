window.onload = async () => {
  document.getElementById('output').value = 'Pyodide loading'
  const START = Date.now()
  // Load Pyodide
  const pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/'
  })
  // Setup Pyodide output
  pyodide.runPython(`
  import sys
  import io
  sys.stdout = io.StringIO()
  `)
  const END = Date.now()
  document.getElementById('output').value += `\nPyodide loaded in ${END - START}ms`

  document.getElementById('test').onclick = () => {
    document.getElementById('output').value = '' // Clear output
    const code = document.getElementById('input').value // Get python code
    pyodide.runPython(code) // Run python
    const stdout = pyodide.runPython('sys.stdout.getvalue()') // Get output
    document.getElementById('output').value = stdout // Display output
  }

  document.getElementById('load').onclick = () => {
    document.getElementById('input').value = Object.values(setup.requiredfiles) // Get code from setup object
    // fetch('')
    //   .then(response => response.text())
    //   .then((data) => {
    //     document.getElementById('input').value = data
    //   })
  }
}
