async function main () {
  const START = Date.now()
  const pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/'
  })
  const END = Date.now()
  console.log(pyodide.runPython("print('Hello, world from the browser!')"))
  console.log(pyodide.runPython(`print('It took ${END - START}ms to load')`))
};
main()
