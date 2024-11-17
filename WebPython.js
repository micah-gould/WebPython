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

const handleError = async (err) => {
  if (err.type !== 'SystemExit') {
    updateTextArea(`${err}\n${(await getOutput()).err}`, OUTPUT, false)
  }
}

const runCode = async (code) => {
  try {
    return await pyodide.runPython(code)
  } catch (err) {
    await handleError(err)
  }
}

// Function to get the output of the python code
const getOutput = async () => {
  const output = (await runCode('sys.stdout.getvalue()'))
    .split('\n')
    .slice(stdoutOLD.length, -1)
    .join('\n') // Get the new outputs
  stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs

  const err = (await runCode('sys.stderr.getvalue()'))
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
    await runCode(`
      import sys
      import io
      sys.stdout = io.StringIO()
      sys.stderr = io.StringIO()
      `) // Capture the Pyodide output
    await pyodide.loadPackage('pillow')
    updateTextArea(`\nPyodide loaded in ${Date.now() - START}ms`, OUTPUT) // Inform the user that Pyodide has loaded
  } catch (err) {
    await handleError(err)
  }
}

const loadFiles = async (files) => {
  for (const filename in files) {
    const file = files[filename]
    const input = ['gif', 'png'].includes(filename.split('.')[1])
      ? Uint8Array.from(atob(file.data), c => c.charCodeAt(0))
      : file
    try {
      await pyodide.FS.writeFile(filename, input, { encoding: 'utf8' })
    } catch (err) {
      await handleError(err)
    }
  }
}

const interleave = (code, inputs) => {
  return `inputs = iter([${inputs}])\n${code}`
    .replace(/(\s*)(\b\w+\b)\s*=\s*.*?\binput\((.*?)\).*/g, (_, indent, variable, prompt) =>
      `${indent}${variable} = next(inputs)${indent}print(f"${prompt.replace(/^["']|["']$/g, '')}{${variable}}")`
    )
}

// Function to compare the given output with the expected output and update all nessasary variables
const check = (expectedOutput, output, attributes) => {
  if (output instanceof Uint8Array && expectedOutput instanceof Uint8Array) {
    if (output.length !== expectedOutput.length) return 'fail'
    for (let a = 0; a < output.length; a++) {
      if (output[a] !== expectedOutput[a]) return 'fail'
    }
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

  return 'pass'
}

const getCheckValues = async (run, file, z) => {
  return [run.output ||
    file?.value ||
    Uint8Array.from(atob(file?.data), c => c.charCodeAt(0)),
  ((await getOutput())?.output ?? (await getOutput())) ||
    (run?.files?.[z]?.name && await pyodide.FS.analyzePath(file.name).exists
      ? await pyodide.FS.readFile(file.name, { encoding: 'utf8' })
      : (await pyodide.FS.analyzePath('out.png').exists
          ? await pyodide.FS.readFile('out.png')
          : 'No output available'))]
}

const runDependents = async (name, otherFiles, conditions) => {
  // Run any other needed files
  if (Object.keys(otherFiles).length === 0) return

  const fileName = name.replace('.py', '') // Get the user's file's name

  // Remove any importing of the user's file because it's functions were initialized
  for (const file in otherFiles) {
    const code = otherFiles[file]
    const checks = checkRequiredForbidden(code, conditions)
    if (checks.result === true) {
      updateTextArea(checks.message ?? '', OUTPUT)
      break
    }
    if (!(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g')).test(code) &&
        !(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm')).test(code)) continue

    await runCode(code)
    if (file.endsWith('Test.py')) await runCode('try:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())')
  }
}

const checkRequiredForbidden = (file, conditions) => {
  let result = false
  let message = null

  conditions?.forEach(test => {
    if (file !== params[test.path]) return

    const matches = new RegExp(test.regex).test(file)
    if ((test?.forbidden && matches) || (!test?.forbidden && !matches)) {
      result = true
      message = test?.message
    }
  })

  return { message, result }
}

const call = async (ins) => {
  const { code, currentRun: run, name, otherFiles, attributes, end, conditions, report } = ins
  let correct = 0
  report.newCall()

  await runCode(code)
  await runDependents(name, otherFiles, conditions)

  const func = run.caption // Get function name
  const input = run.args.filter(arg => arg.name === 'Arguments')[0].value // Get the inputs
  await runCode(`print(${func}(${input}))`) // Run each testcase

  const filesAndImages = [...(run?.files ?? []), ...(run?.images ?? [])]
  for (let z = 0; z < (run?.length || 1); z++) {
    const [expectedOutput, output] = await getCheckValues(run, filesAndImages[z], z)
    const pf = check(expectedOutput, output, attributes)
    correct += pf === 'pass' ? 1 : 0
    report.newRow()
    report.pf(pf)
    report.name(func)
    report.arg(input)
    report.closeRow(output, expectedOutput)
  }

  if (end) report.closeTable()
  return { correct }
}

const run = async (ins) => {
  const { code, currentRun: run, name, otherFiles, attributes, end, conditions, report } = ins
  let correct = 0

  report.newRun(name)

  const inputs = run.input?.split('\n') ?? '' // Get the inputs

  // Replace a user input with a computer input
  newCode = (/input\((.*?)\)/).test(code)
    ? (attributes?.interleave ?? true)
        ? interleave(code, inputs)
        : `sys.stdin = io.StringIO("""${inputs.join('\n')}""")\n${code}`
    : code

  await runCode(newCode) // Run each testcase
  await runDependents(name, otherFiles, conditions)

  const filesAndImages = [...(run?.files ?? []), ...(run?.images ?? [])]
  for (let z = 0; z < (filesAndImages?.length || 1); z++) {
    const [expectedOutput, output] = await getCheckValues(run, filesAndImages[z], z)
    const pf = check(expectedOutput, output, attributes)
    correct += pf === 'pass' ? 1 : 0
    report.newRow()
    report.pf(pf)
    report.closeRow(expectedOutput, output)
  }

  if (end) report.closeTable()
  return { correct }
}

const sub = async (ins) => {
  const { code, currentRun: run, name, otherFiles, attributes, end, conditions, report } = ins
  let correct = 0

  const args = run.args.filter(arg => !['Arguments', 'Command line arguments'].includes(arg.name))
  report.newSub(args)

  // Replace the variables with their new values
  const newCode = args.reduce((acc, arg) => acc.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`), code)

  await runCode(newCode) // Run each testcase
  await runDependents(name, otherFiles, conditions)

  const filesAndImages = [...(run?.files ?? []), ...(run?.images ?? [])]
  for (let z = 0; z < (filesAndImages?.length || 1); z++) {
    const [expectedOutput, output] = await getCheckValues(run, filesAndImages[z], z)
    const pf = check(expectedOutput, output, attributes)
    correct += pf === 'pass' ? 1 : 0
    report.newRow()
    report.pf(pf)
    report.name(name.split('.')[0])
    args.forEach(arg => report.arg(arg.value))
    report.closeRow(output, expectedOutput)
  }

  if (end) report.closeTable()
  return { correct }
}

const unitTest = async (ins) => {
  const { currentRun: run, name, otherFiles, conditions, report } = ins

  report.newUnitTest()

  await runDependents(name, otherFiles, conditions)
  const total = (run.output?.split('\n')?.[0]?.match(/\./g) || []).length
  const correct = ((await getOutput()).err?.split('\n')?.[0]?.match(/\./g) || []).length
  let pf
  if (run?.files?.length > 0) {
    console.log('FILES') // FIXME: figure out how to deal with unittest in this case if needed
  } else {
    pf = correct === total ? 'pass' : 'fail'
  }

  report.pf(pf)
  return { correct, total }
}

const tester = async (ins) => {
  const { currentRun: run, name, otherFiles, conditions, report } = ins
  let correct = 0

  report.newTester()

  await runDependents(name, otherFiles, conditions)
  let HTMLoutput = '<pre class=\'output\'>'
  const expectedOutputs = run.output?.split('\n')?.filter(Boolean)
  const outputs = (await getOutput()).output?.split('\n')
  for (let k = 0; k < expectedOutputs.length; k++) {
    if (run?.files?.length > 0) {
      console.log('FILES') // FIXME: figure out how to deal with unittest in this case if needed
    } else {
      const pf = check(expectedOutputs[k], outputs[k])
      correct += pf === 'pass' ? 1 : 0
      report.pf(pf)
      HTMLoutput += `${outputs[k]}\n<span class=${pf}>${expectedOutputs[++k]}</span>\n`
    }
  }
  total = outputs.length / 2
  report.append(HTMLoutput)

  return { correct, total }
}

window.addEventListener('load', () => {
  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup
    .map(a => (a?.description ?? ''))
    .join('\n') // Set the description of the task
  OUTPUT = document.getElementById('output') // Get the text area for the output
})

// Function that process the problems
async function python (setup, params) {
  await setupPyodide()
  updateTextArea('', OUTPUT, false) // Clear output

  // Generic HTML for every case
  const report = new ReportBuilder()
  // Itterate over each section
  for (const section of setup.sections) {
    // Variables that are needed in every case
    let total = section.runs.length
    let correct = 0
    const otherFiles = { ...(setup?.useFiles ?? {}), ...(setup?.hiddenFiles ?? {}) }
    const allFiles = Object.fromEntries(Object.entries({ ...params, ...otherFiles }).filter(([key]) => key.includes('.')))

    // Iterrate over runs array
    for (const currentRun of section.runs) {
      const name = currentRun.mainclass // Get the name of the file
      const code = allFiles[name] // Get python code

      await loadFiles(allFiles)

      const checks = checkRequiredForbidden(code, setup?.conditions)
      if (checks.result === true) {
        updateTextArea(checks.message ?? '', OUTPUT)
        break
      }

      if (currentRun?.args?.filter(arg => arg.name === 'Command line arguments').length > 0) {
        const args = currentRun.args.filter(arg => arg.name === 'Command line arguments')?.map(arg => arg?.value?.split(' '))?.flat() ?? []
        args.unshift(name)
        await runCode(`sys.argv = ${await pyodide.toPy(args)}`)
      }

      const functions = { call, run, sub, unitTest, tester }
      const { correct: newCorrect, total: newTotal } = await functions[section.type]?.({
        code,
        currentRun,
        name,
        otherFiles,
        attributes: setup?.attributes,
        conditions: setup?.conditions,
        end: section.runs.indexOf(currentRun) === total - 1,
        report
      }) ?? console.error('Function not found')
      correct += newCorrect
      total = newTotal ?? total
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
