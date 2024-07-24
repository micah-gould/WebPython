window.onload = async () => {
  const OUTPUT = document.getElementById('output')
  const INPUT = document.getElementById('input')
  OUTPUT.value = 'Pyodide loading'
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
  OUTPUT.value += `\nPyodide loaded in ${END - START}ms`

  document.getElementById('test').onclick = () => {
    OUTPUT.value = '' // Clear output
    const code = INPUT.value // Get python code
    pyodide.runPython(code) // Run python
    const stdout = pyodide.runPython('sys.stdout.getvalue()') // Get output. FIXME: Currently gets all the outputs since loading
    OUTPUT.value = stdout // Display output
  }

  document.getElementById('load').onclick = () => {
    INPUT.value = Object.values(setup.requiredfiles) // Get code from setup object
    // fetch('')
    //   .then(response => response.text())
    //   .then((data) => {
    //     INPUT.value = data
    //   })
  }

  document.getElementById('run').onclick = () => {
    OUTPUT.value = '' // Clear output
    const code = INPUT.value // Get python code
    pyodide.runPython(code) // Run python
    const func = code.split('\n')[0].split(' ')[1].split('(')[0] // Get function name
    const total = setup.inputs.length
    let correct = 0
    let incorrect = 0
    for (let i = 0; i < total; i++) {
      pyodide.runPython(`print(${func}('${setup.inputs[i]}'))`) // Run each testcase
      const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(-2)[0] // Get output
      OUTPUT.value += stdout // Display output
      if (stdout === setup.outputs[i]) { // Check if output was correct
        correct++
        OUTPUT.value += ` CORRECT, Score: ${(correct / (i + 1)) * 100}%\n`
      } else {
        incorrect++
        OUTPUT.value += ` CORRECT, Score: ${(incorrect / (i + 1)) * 100}%\n`
      }
    }
    OUTPUT.value += `Correct: ${correct}, Incorrect: ${incorrect}, Score: ${(correct / total) * 100}%` // Final score
  }
}
