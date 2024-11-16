/* TODO:
Deal with timeout */

/* eslint no-undef: off, no-unused-vars: off
    -------------
    no-undef is off because loadPyodide doesn't need to be declared locally
    no-unused-vars is off because the function Python is written in this file but called from another */

let stdoutOLD = [] // Array to store all past outputs (by line)
let stderrOLD = [] // Array to store all past errors (by line)
let OUTPUT, pyodide // Variables that need to be global

const updateTextArea = (text, area, append = true) => {
  area.value = append ? (area.value + text).trim() : text
  area.style.height = 'auto'
  area.style.height = `${area.scrollHeight}px`
}

const runCode = (code) => {
  try {
    return pyodide.runPython(code)
  } catch (err) {
    if (err.type !== 'SystemExit') {
      updateTextArea(`${err}\n${getOutput().err}`, OUTPUT, false)
    }
  }
}

// Function to get the output of the python code
const getOutput = () => {
  const output = runCode('sys.stdout.getvalue()')
    .split('\n')
    .slice(stdoutOLD.length, -1)
    .join('\n') // Get the new outputs
  stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs

  const err = runCode('sys.stderr.getvalue()')
    .split('\n')
    .slice(stderrOLD.length, -1)
    .join('\n') // Get the new errors
  stderrOLD = stderrOLD.concat(err.split('\n')) // Add the new errors to the list of old errors

  if (output === '' && err === '') return OUTPUT.value
  updateTextArea(`\n${output}\n${err}`, OUTPUT)
  return { output, err }
}

const setupPyodide = async () => {
  stdoutOLD = []
  stderrOLD = []
  updateTextArea('Pyodide loading', OUTPUT) // Inform the user that Pyodide is loading

  const START = Date.now() // Get the current time

  try {
    pyodide = await loadPyodide() // Load Pyodide
    pyodide.runPython(`
      import sys
      import io
      sys.stdout = io.StringIO()
      sys.stderr = io.StringIO()
      `) // Capture the Pyodide output
    await pyodide.loadPackage('pillow')
    updateTextArea(`\nPyodide loaded in ${Date.now() - START}ms`, OUTPUT) // Inform the user that Pyodide has loaded
  } catch (err) {
    if (err.type !== 'SystemExit') {
      updateTextArea(`${err}\n${getOutput().err}`, OUTPUT, false)
    }
  }
}

window.addEventListener('load', () => {
  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup
    .map(a => (a?.description ?? ''))
    .join('\n') // Set the description of the task
  OUTPUT = document.getElementById('output') // Get the text area for the output
})

const loadFiles = (files) => {
  for (const filename in files) {
    const file = files[filename]
    const input = ['gif', 'png'].includes(filename.split('.')[1])
      ? new Uint8Array(Array.from(atob(file.data), c => c.charCodeAt(0)))
      : file
    try {
      pyodide.FS.writeFile(filename, input, { encoding: 'utf8' })
    } catch (err) {
      if (err.type !== 'SystemExit') {
        updateTextArea(`${err}\n${getOutput().err}`, OUTPUT, false)
      }
    }
  }
}

// Function that process the problems
async function python (setup, params) {
  const getCheckValues = (run, file, z) => {
    return [run.output ||
      file?.value ||
      new Uint8Array(Array.from(atob(file?.data), c => c.charCodeAt(0))),
    (getOutput()?.output ?? getOutput()) ||
      (run?.files?.[z]?.name && pyodide.FS.analyzePath(file.name).exists
        ? pyodide.FS.readFile(file.name, { encoding: 'utf8' })
        : (pyodide.FS.analyzePath('out.png').exists
            ? pyodide.FS.readFile('out.png')
            : 'No output available'))]
  }

  const runDependents = (name, otherFiles) => {
    // Run any other needed files
    if (Object.keys(otherFiles).length === 0) return

    const fileName = name.replace('.py', '') // Get the user's file's name

    // Remove any importing of the user's file because it's functions were initialized
    for (const file of Object.keys(otherFiles)) {
      const code = otherFiles[file]
      const checks = checkRequiredForbidden(code)
      if (checks.result === true) {
        updateTextArea(checks.message ?? '', OUTPUT)
        break
      }
      if (!(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g')).test(code) &&
          !(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm')).test(code)) continue

      runCode(code)
      if (file.endsWith('Test.py')) runCode('try:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())')
    }
  }

  const checkRequiredForbidden = (file) => {
    let result = false
    let message = null

    setup.conditions?.forEach(test => {
      if (file !== params[test.path]) return

      const matches = new RegExp(test.regex).test(file)
      if ((test?.forbidden && matches) || (!test?.forbidden && !matches)) {
        result = true
        message = test?.message
      }
    })

    return { message, result }
  }

  await setupPyodide()
  OUTPUT.value = '' // Clear output

  // Generic HTML for every case
  const report = new ReportBuilder()
  // Itterate over each section
  for (const section of setup.sections) {
    // Variables that are needed in every case
    let code
    let total = section.runs.length
    let correct = 0
    const otherFiles = { ...(setup?.useFiles ?? {}), ...(setup?.hiddenFiles ?? {}) }
    const allFiles = Object.fromEntries(Object.entries({ ...params, ...otherFiles }).filter(([key]) => key.includes('.')))

    // Function to compare the given output with the expected output and update all nessasary variables
    const check = (expectedOutput, output, weight = 1) => {
      const attributes = setup?.attributes

      total += weight - 1 // Used for the unit test to show the correct number of test, can be used if you want to weigh one input more than another

      if (output instanceof Uint8Array && expectedOutput instanceof Uint8Array) {
        if (output.length !== expectedOutput.length) return 'fail'
        for (let a = 0; a < output.length; a++) {
          if (output[a] !== expectedOutput[a]) return 'fail'
        }
        correct += weight
        return 'pass'
      }

      if (attributes?.ignorecase === true) {
        output = output.toLowerCase() // Closest JS equivlent to equalsIgnoreCase
        expectedOutput = expectedOutput.toLowerCase()
      }

      if (attributes?.ignorespace === true) {
        output = output.replace(/\s+/g, '') // Equivlent to normalizeWS from java
        expectedOutput = expectedOutput.replace(/\s+/g, '')
      }

      if (Number.isFinite(Number(output))) {
        const tolerance = attributes?.tolerance ?? 0.000001
        output = Math.round(output / tolerance) * tolerance // Server uses different method but I like this better
        expectedOutput = Math.round(expectedOutput / tolerance) * tolerance
      } else {
        expectedOutput = expectedOutput.trim()
        output = output.trim()
      }

      if (expectedOutput !== output) { // Check if output was correct
        return 'fail'
      }

      correct += weight
      return 'pass'
    }

    const call = (run, name) => {
      report.newCall()

      runCode(code)
      runDependents(name, otherFiles)

      const func = run.caption // Get function name
      const input = run.args.filter(arg => arg.name === 'Arguments')[0].value // Get the inputs
      runCode(`print(${func}(${input}))`) // Run each testcase

      const filesAndImages = [...(run?.files ?? []), ...(run?.images ?? [])]
      for (let z = 0; z < (run?.length || 1); z++) {
        const [expectedOutput, output] = getCheckValues(run, filesAndImages[z], z)
        const pf = check(expectedOutput, output)
        report.newRow()
        report.pf(pf)
        report.name(name.split('.')[0])
        report.arg(input)
        report.closeRow(output, expectedOutput)
      }

      if (section.runs.indexOf(run) === total - 1) report.closeTable()
      return true
    }

    const run = (run, name) => {
      report.newRun(name)

      const inputs = run.input?.split('\n') ?? '' // Get the inputs

      if ((/input\((.*?)\)/).test(code)) {
        // Replace a user input with a computer input
        const newStr = 'next(inputs)'
        let newCode = `inputs = iter([${inputs}])\n${code}`

        code.match(/input\((.*?)\)/g).forEach(inputCall => {
          // Find the index of the newline after the input call
          const inputIndex = newCode.indexOf('\n', newCode.indexOf(inputCall) + inputCall.length)

          // Extract the variable assigned to the input call
          const variable = newCode.match(/(\b\w+\b)\s*=\s*.*?\binput\(/)[1]

          // Extract the prompt inside the input parentheses
          const prompt = inputCall.match(/input\((.*?)\)/)[1].replace(/^["']|["']$/g, '')

          // Add a print statement to show the input question and the entered value
          const indent = newCode.slice(inputIndex).match(/^\s*/)[0] // Get indentation
          newCode = `${newCode.slice(0, inputIndex)}
          ${indent}print(f"${prompt}{${variable}}")
          ${newCode.slice(inputIndex)}`

          // Replace the input call with `next(inputs)`
          newCode = newCode.replace(/input\((.*?)\)/, newStr)
        })

        runCode(newCode) // Run each testcase
      } else {
        runCode(code) // Run each testcase
      }
      runDependents(name, otherFiles)

      const filesAndImages = [...(run?.files ?? []), ...(run?.images ?? [])]
      for (let z = 0; z < (filesAndImages?.length || 1); z++) {
        const [expectedOutput, output] = getCheckValues(run, filesAndImages[z], z)
        const pf = check(expectedOutput, output)
        report.newRow()
        report.pf(pf)
        report.closeRow(expectedOutput, output)
      }

      if (section.runs.indexOf(run) === total - 1) report.closeTable()
      return true
    }

    const sub = (run, name) => {
      const args = run.args.filter(arg => !['Arguments', 'Command line arguments'].includes(arg.name))
      report.newSub(args)

      let newCode = code // Copy the code
      // Replace the variables with their new values
      for (const arg of args) {
        newCode = newCode.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`)
      }
      runCode(newCode) // Run each testcase
      runDependents(name, otherFiles)

      const filesAndImages = [...(run?.files ?? []), ...(run?.images ?? [])]
      for (let z = 0; z < (filesAndImages?.length || 1); z++) {
        const [expectedOutput, output] = getCheckValues(run, filesAndImages[z], z)
        const pf = check(expectedOutput, output)
        report.newRow()
        report.pf(pf)
        report.name(name.split('.')[0])
        args.forEach(arg => report.arg(arg.value))
        report.closeRow(output, expectedOutput)
      }

      if (section.runs.indexOf(run) === total - 1) report.closeTable()
      return true
    }

    const unitTest = (run, name) => {
      report.newUnitTest()

      runCode(code)
      runDependents(name, otherFiles)
      total = (run.output?.split('\n')?.[0]?.match(/\./g) || []).length
      correct = (getOutput().err?.split('\n')?.[0]?.match(/\./g) || []).length
      let pf
      if (run?.files?.length > 0) {
        console.log('FILES') // FIXME: figure out how to deal with unittest in this case if needed
      } else {
        pf = correct === total ? 'pass' : 'fail'
      }

      report.pf(pf)
      return true
    }

    const tester = (run, name) => {
      report.newTester()

      // runCode(code)
      runDependents(name, otherFiles)
      let HTMLoutput = '<pre class=\'output\'>'
      const expectedOutputs = run.output?.split('\n')?.filter(n => !!n)
      const outputs = getOutput().output?.split('\n')
      for (let k = 0; k < expectedOutputs.length; k++) {
        if (run?.files?.length > 0) {
          console.log('FILES') // FIXME: figure out how to deal with unittest in this case if needed
        } else {
          const pf = check(expectedOutputs[k], outputs[k])
          report.pf(pf)
          HTMLoutput += `${outputs[k]}\n<span class=${pf}>${expectedOutputs[++k]}</span>\n`
        }
      }
      total = outputs.length / 2
      report.append(HTMLoutput)

      return true
    }

    // Iterrate over runs array
    for (const currentRun of section.runs) {
      const name = currentRun.mainclass // Get the name of the file
      code = allFiles[name] // Get python code

      loadFiles(allFiles)

      const checks = checkRequiredForbidden(code)
      if (checks.result === true) {
        updateTextArea(checks.message ?? '', OUTPUT)
        break
      }

      if (currentRun?.args?.filter(arg => arg.name === 'Command line arguments').length > 0) {
        const args = currentRun.args.filter(arg => arg.name === 'Command line arguments')?.map(arg => arg?.value?.split(' '))?.flat() ?? []
        args.unshift(name)
        runCode(`sys.argv = ${pyodide.toPy(args)}`)
      }

      const functions = { call, run, sub, unitTest, tester }
      functions[section.type]?.(currentRun, name) ?? console.error('Function not found')
    }

    report.studentFiles(Object.fromEntries(Object.keys(params)
      .filter(file => Object.keys(setup.requiredFiles).includes(file))
      .map(file => [file, params[file]])))
    report.providedFiles(setup.useFiles)
    report.score(correct, total)
  }

  report.end()
  return { report: report.value() }
}
