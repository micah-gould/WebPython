window.addEventListener('load', async () => {
  const data = setup
  const OUTPUT = document.getElementById('output')
  const INPUT = document.getElementById('input')
  OUTPUT.value = 'Pyodide loading'
  const START = Date.now()
  // Load Pyodide
  const pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/',
    stdout: (msg) => { OUTPUT.value += `\nPyodide: ${msg}` }
  })
  // data Pyodide output
  pyodide.runPython(`
  import sys
  import io
  sys.stdout = io.StringIO()
  `)
  const END = Date.now()
  OUTPUT.value += `\nPyodide loaded in ${END - START}ms`

  let stdoutOLD = [] // Array to store all past outputs (by line)

  document.getElementById('test').onclick = () => {
    OUTPUT.value = '' // Clear output
    const code = INPUT.value // Get python code
    try {
      pyodide.runPython(code) // Run python
      const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
      stdoutOLD = stdoutOLD.concat(stdout.split('\n')) // Add the new outputs to the list of old outputs
      OUTPUT.value = stdout // Display output
    } catch (err) {
      OUTPUT.value = err.message
    }
  }

  document.getElementById('load').onclick = () => {
    if (!Array.isArray(data.requiredfiles)) {
      INPUT.value = Object.values(data.requiredfiles).join('\n') // Get code from data object
      return
    }
    data.requiredfiles.forEach(file => {
      fetch(file)
        .then(response => response.text())
        .then((data) => {
          INPUT.value += data
        })
    })
  }

  document.getElementById('run').onclick = () => {
    OUTPUT.value = '' // Clear output
    const code = INPUT.value // Get python code
    try {
      pyodide.runPython(code) // Run python
      // This code fixes an issue if the user leaves in any print statemnts in the code
      const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
      stdoutOLD = stdoutOLD.concat(stdout.split('\n')) // Add the new outputs to the list of old outputs
    } catch (err) {
      OUTPUT.value = err
    }

    const func = code.split('\n').filter(a => a.slice(0, 3) === 'def')[0].split(' ')[1].split('(')[0] // Get first function name
    const total = data.inputs.length
    let correct = 0
    let incorrect = 0

    try {
      for (let i = 0; i < total; i++) {
        pyodide.runPython(`print(${func}('${data.inputs[i]}'))`) // Run each testcase
        const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
        stdoutOLD = stdoutOLD.concat(stdout.split('\n')) // Add the new outputs to the list of old outputs
        OUTPUT.value += stdout // Display output
        if (stdout === data.outputs[i]) { // Check if output was correct
          correct++
          OUTPUT.value += ` CORRECT, Score: ${(correct / (i + 1)) * 100}%\n`
        } else {
          incorrect++
          OUTPUT.value += ` INCORRECT, Score: ${(correct / (i + 1)) * 100}%\n`
        }
      }
      OUTPUT.value += `Correct: ${correct}, Incorrect: ${incorrect}, Score: ${(correct / total) * 100}%` // Final score
    } catch (err) {
      OUTPUT.value = err
    }
  }
})
