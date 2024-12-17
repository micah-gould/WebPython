/* eslint no-undef: off, no-unused-vars: off
    -------------
!   no-undef is off because loadPyodide doesn't need to be declared locally
!   no-unused-vars is off because the function Python is written in this file but called from another
*/

const appState = {
  OUTPUT: undefined,
  worker: undefined,
  timeoutId: undefined,
  hasReturned: false
} // Variables that need to be global

const imageEndings = ['apng', 'avif', 'bmp', 'cur', 'gif', 'ico', 'jfif', 'jpeg', 'jpg', 'pjp', 'pjpeg', 'png', 'svg', 'webp']

//* Function to setup the closure for getOutput so that stdoutOLD and stderrOLD will not be global variables
function createGetOutput () {
  let stdoutOLD = [] // Array to store all past outputs (by line)
  let stderrOLD = [] // Array to store all past errors (by line)

  // Function that gets the output of the python code
  return async function (hidden = false) {
    const preOutput = (await runCode('sys.stdout.getvalue()')).result.split('\n')

    if (preOutput.length < stdoutOLD.length) stdoutOLD = []

    const output = preOutput.slice(stdoutOLD.length, -1).join('\n') // Get the new outputs

    stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs

    const preError = (await runCode('sys.stderr.getvalue()')).result.split('\n')

    if (preError.length < stderrOLD.length) stdoutOLD = []

    const err = preError.slice(stderrOLD.length, -1).join('\n') // Get the new errors

    stderrOLD = stderrOLD.concat(err.split('\n')) // Add the new errors to the list of old errors

    if (output === '' && err === '') return appState.OUTPUT.value
    updateTextArea(hidden ? '\n[Hidden]' : `\n${output}`, appState.OUTPUT)
    if (!(err.includes('SystemExit'))) updateTextArea(`\n${err}`, appState.OUTPUT)
    return { output, err }
  }
}

const getOutput = createGetOutput()

// Once the window is loaded the decription can be set and the text area for the output can be retrived
window.addEventListener('load', async () => {
  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup
    .map(a => (a?.description ?? ''))
    .join('\n') // Set the description of the task
  appState.OUTPUT = document.getElementById('output') // Get the text area for the output
  await setupPyodide()

  const targetDiv = document.querySelector('.codecheck-submit-response')

  const debounce = (func) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      if (appState.hasReturned) timeout = setTimeout(() => func(...args), 1)
    }
  }
  // Create a MutationObserver
  const observer = new MutationObserver(debounce((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const diffCells = document.querySelectorAll(`${targetDiv.tagName} .diff`)
        if (diffCells.length === 0) document.getElementById('diff-header')?.classList?.add('hidden')

        const expectedCells = document.querySelectorAll(`${targetDiv.tagName} .expected`)
        if (expectedCells.length === 0) document.getElementById('expected-header')?.classList?.add('hidden')
      }
    }
  }))

  // Configure the observer to look for changes in child nodes
  observer.observe(targetDiv, { childList: true })
})

//* Code starts here when it is called from horstmann_codecheck.js
async function python (setup, params) {
  if (appState.hasReturned) await setupPyodide() // Load pyodide each time because otherwise there is an issue with the outputs
  appState.hasReturned = false

  updateTextArea('', appState.OUTPUT, false) // Clear the output

  const report = new ReportBuilder() // Create a new HTML report to return

  // Itterate over each section
  for (const section of setup.sections) {
    // Variables that are needed in every case
    let total = 0
    let correct = 0
    const otherFiles = { ...(setup?.useFiles ?? {}), ...(setup?.hiddenFiles ?? {}) } // Object of all non-editible files
    const allFiles = Object.fromEntries(Object.entries({ ...params, ...otherFiles }).filter(([key]) => key.includes('.'))) // Object of all files including student files

    await loadFiles(allFiles) // Load all files in the pyodide file system

    // Iterrate over runs array
    for (const currentRun of section.runs) {
      const name = currentRun.mainclass // Get the name of the file to run
      const code = allFiles[name] // Get python code

      const checks = checkRequiredForbidden(code, setup?.conditions, allFiles) // Check if the user's code follows the required and forbidden riles
      if (checks.result === true) {
        updateTextArea(checks.message ?? '', appState.OUTPUT) // Post the error message to the user
        break
      }

      const argv = currentRun
        ?.args
        ?.filter(arg => arg.name === 'Command line arguments')
        ?.map(arg => arg?.value?.split(' '))
        ?.flat() ?? [] // Get the command line arguments
      argv.unshift(name) // Add the filename to the args to simulate sys.argv
      await runCode(`sys.argv = ${JSON.stringify(argv)}`) // Update sys.argv with the correct values

      // Run the correct case
      const functions = { call, run, sub, unitTest, tester }
      const { correct: newCorrect, total: newTotal, error } = await functions[section.type]?.({
        code,
        run: currentRun,
        name,
        otherFiles,
        attributes: setup?.attributes,
        conditions: setup?.conditions,
        end: section.runs.indexOf(currentRun) === section.runs.length - 1,
        report,
        allFiles
      }) ?? console.error('Function not found') //! Unknown test case type
      if (error) return { report: error }
      correct += newCorrect
      total += newTotal
    }
    report.studentFiles(Object.fromEntries(Object.keys(params)
      .filter(file => Object.keys(setup.requiredFiles).includes(file))
      .map(file => [file, params[file]])))
    report.providedFiles(setup.useFiles)
    report.score(correct, total)
  }

  report.end()

  const buttons = document.querySelectorAll('.codecheckSubmit span')

  buttons.forEach(button => {
    button.classList.remove('disabled') // Remove disabled styling
  })

  appState.hasReturned = true

  return { report: report.report }
}

// Function that sets up Pyodide
async function setupPyodide () {
  const firstLoad = appState.worker === undefined

  const buttons = document.querySelectorAll('.codecheckSubmit span')

  // Disable all the buttons
  buttons.forEach(button => {
    button.classList.add('disabled')
  })

  appState.stdoutOLD = []
  appState.stderrOLD = []
  updateTextArea('Pyodide loading', appState.OUTPUT, false) // Inform the user that Pyodide is loading

  const START = Date.now() // Get the current time

  try {
    appState.worker = new Worker('JS/pyodideWorker.js' /* path from the HTML file */) // Load Pyodide
    const END = (await runWorker({ type: 'setup' })).endTime
    updateTextArea(`\nPyodide loaded in ${END - START}ms`, appState.OUTPUT) // Inform the user that Pyodide has loaded
  } catch (err) {
    await handleError(err)
  }

  if (!firstLoad) return

  buttons.forEach(button => {
    button.classList.remove('disabled') // Remove disabled styling
  })
}

// Function that updates the value of the output and resize it
function updateTextArea (text, area, append = true) {
  area.value = append ? (area.value + text).trim() : text
  area.style.height = 'auto'
  area.style.height = `${area.scrollHeight}px`
}

//! Need to run code through this function and not "appState.worker.postMessage()"
async function runWorker (code) {
  appState.worker.postMessage(code) //* Post the message to the worker
  const result = await new Promise(resolve => { //* Wait for the worker to finsih processing the message
    appState.worker.onmessage = event => {
      clearTimeout(appState.timeoutId) //* If the code ran within the maxtime, clear the timeout
      resolve(event.data)
    }
  })
  return result.success ? result : new Error(result.error)
}

//! Function that handles all python errors
async function handleError (err) {
  if (err.type !== 'SystemExit') { //* Ignore a system.exit()
    updateTextArea(`${err}\n${(await getOutput()).err}`, appState.OUTPUT, false)
  }
}

// Function that runs python code
async function runCode (code, timeout = 30000) {
  clearTimeout(appState.timeoutId) //* Reset the timeout
  appState.timeoutId = setTimeout(() => {
    appState.worker.terminate() //! Stop the worker if it takes too long
    updateTextArea(`Python code execution timed out after ${timeout} seconds`, appState.OUTPUT, false)
    document.getElementsByClassName('codecheck-submit-response')[0].textContent = 'Max execution time exceeded'
  }, timeout)
  try {
    return await runWorker({ type: 'runCode', code })
  } catch (err) {
    await handleError(err)
  }
}

// Function that loads Pyodide file system
async function loadFiles (files) {
  for (const fileName in files) {
    const file = files[fileName] // Get the code/text/imageData
    const input = imageEndings.includes(fileName.split('.')[1]) // Check if the file is an image
      ? Uint8Array.from(atob(file.data), c => c.charCodeAt(0)) // Decode image
      : file
    try {
      await runWorker({ type: 'writeFile', fileName, input })
    } catch (err) {
      await handleError(err)
    }
  }
  return (await runWorker({ type: 'readcwd' })).files
}

// Function that check is the user's code follows all the required and forbiden rules
function checkRequiredForbidden (file, conditions, allFiles) { // FIXME: find a testcase and rewrite this function
  let result = false
  let message = null

  conditions?.forEach(test => {
    if (file !== allFiles[test.path]) return

    const matches = new RegExp(test.regex).test(file)
    if ((test?.forbidden && matches) || (!test?.forbidden && !matches)) {
      result = true
      message = test?.message
    }
  })

  return { message, result }
}

// Function that runs the "call" case
async function call (ins) {
  const { code, run, name, otherFiles, attributes, end, conditions, report, allFiles } = ins
  report.newCall()

  await runCode(code, attributes?.timeout)
  await runDependents(name, otherFiles, conditions, allFiles)

  const func = run.caption // Get function name
  const input = run.args.filter(arg => arg.name === 'Arguments')[0].value // Get the inputs
  await runCode(`print(${func}(${input}))`, attributes?.timeout) // Run each testcase

  const { correct, total } = await processOutputs({ run, filesAndImages: getFilesAndImages(run?.files, run?.images), attributes, report, func, input: [input], allFiles })

  if (end) report.closeTable()
  return { correct, total }
}

// Function that runs the "run" case
async function run (ins) {
  const { code, run, name, otherFiles, attributes, end, conditions, report, allFiles } = ins

  report.newRun(name)

  const inputs = run.input?.split('\n') ?? '' // Get the inputs

  // Replace a user input with a computer input
  if ((/input\((.*?)\)/).test(code)) await runCode(`sys.stdin = io.StringIO("""${inputs.join('\n')}""")\n`)

  if (attributes?.interleave ?? true) await interleave()

  await runCode(code, attributes?.timeout) // Run each testcase
  await runDependents(name, otherFiles, conditions, allFiles)

  const { correct, total } = await processOutputs({ run, filesAndImages: getFilesAndImages(run?.files, run?.images), attributes, report, allFiles })

  if (end) report.closeTable()
  return { correct, total }
}

// Function that runs the "sub" case
async function sub (ins) {
  const { code, run, name, otherFiles, attributes, end, conditions, report, allFiles } = ins

  const args = run.args.filter(arg => !['Arguments', 'Command line arguments'].includes(arg.name))
  report.newSub(args)

  // Replace the variables with their new values
  const newCode = args.reduce((acc, arg) => acc.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`), code)

  await runCode(newCode, attributes?.timeout) // Run each testcase
  await runDependents(name, otherFiles, conditions, allFiles)

  const { correct, total } = await processOutputs({ run, filesAndImages: getFilesAndImages(run?.files, run?.images), attributes, report, name, args, allFiles })

  if (end) report.closeTable()
  return { correct, total }
}

// Function that runs the "unitTest" case
async function unitTest (ins) {
  const { run, name, otherFiles, conditions, report, allFiles } = ins

  report.newUnitTest()

  await runDependents(name, otherFiles, conditions, allFiles)
  const total = (run.output?.split('\n')?.[0]?.match(/\./g) || []).length
  const correct = ((await getOutput(run?.hidden)).err?.split('\n')?.[0]?.match(/\./g) || []).length
  const pf = correct === total ? 'pass' : 'fail'

  report.pf(pf)
  return { correct, total }
}

// Function that runs the "tester" case
async function tester (ins) {
  const { run, name, otherFiles, conditions, report, allFiles } = ins

  if (run?.hidden !== true) report.newTester()

  await runDependents(name, otherFiles, conditions, allFiles)
  const tests = report.newTests()
  const output = (await getCheckValues(run)).actual
  const outputs = output.split('\n')
  const matches = new Set()
  const mismatches = new Set()
  const expectedTests = output.match(/expected/gi).length
  let actualTests = 0

  for (let i = 0; i < outputs.length; i++) {
    if (outputs[i].split(':')[0].toLowerCase() !== 'expected') continue
    actualTests++
    if (i === 0) {
      return { error: '<body>No actual value for "Expected: ..." in line 1</body>' }
    }
    const expected = getSuffix(outputs[i])
    const actual = outputs[i - 1]
    // The second comparison is needed if actual has no prefix
    // but a colon
    let pf = (await check({ actual: getSuffix(actual), expected })).pf
    if (pf === 'fail') pf = (await check({ actual, expected })).pf
    if (pf === 'pass') {
      report.pf('pass')
      matches.add(i)
    } else {
      mismatches.add(i)
      report.pf('fail')
    }
    tests.addTest(run?.hidden, actual, expected, pf)
  }

  if (actualTests !== expectedTests) return { error: '<body>Program exited before all expected values were printed.</body>' }

  const correct = matches.size
  const total = expectedTests
  tests.append()

  return { correct, total }
}

// Function that runs all files that call the user's file
async function runDependents (name, otherFiles, conditions, allFiles) {
  // Run any other needed files
  if (Object.keys(otherFiles).length === 0) return

  const fileName = name.replace('.py', '') // Get the user's file's name

  // Remove any importing of the user's file because it's functions were initialized
  for (const file in otherFiles) {
    const code = otherFiles[file]
    const checks = checkRequiredForbidden(code, conditions, allFiles)
    if (checks.result === true) {
      updateTextArea(checks.message ?? '', appState.OUTPUT)
      break
    }
    // TODO: can this be less fragaile
    if (!(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g')).test(code) && //* Ignore files that don't call the mainclass.
        !(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm')).test(code)) continue //! Could there be other ways files are called??

    if (/^(.*(Test|_test|Tester|_tester|Runner|_runner)(\d*)\.py)$/.test(file)) await runCode(code)
    if (/^(.*(Test|_test)(\d*)\.py)$/.test(file)) await runCode('try:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())')
  }
}

function getFilesAndImages (files, images) {
  return [...Object.entries(files ?? {}).map(([title, data]) => (
    {
      name: title,
      value: data
    })), ...images ?? []]
}

// Function that processes outputs
async function processOutputs (ins) {
  const { run, filesAndImages, attributes, report, name, args, allFiles } = ins
  let correct = 0
  let total = 0
  for (let z = -1; z < (filesAndImages?.length ?? 0); z++) {
    const { expected, actual } = await getCheckValues({ run, file: filesAndImages[z], getName: await getImageName(Object.keys(allFiles)) })
    const { pf, imageDiff } = await check({ actual, expected, attributes })
    if (pf === undefined) continue
    correct += pf === 'pass' ? 1 : 0

    report.newRow()
    report.pf(pf)
    if (name) report.info(run?.hidden, name)
    if (args) args.forEach(arg => report.info(run?.hidden, arg.value ?? arg))
    report.closeRow({ actual, expected, imageDiff, hidden: run?.hidden, pass: pf === 'pass' })

    total++
  }
  return { correct, total }
}

async function getImageName (fileNames) { // TODO: will be fixed
  const images = [...new Set(fileNames
    .filter(file => imageEndings.includes(file.split('.')[1]))
    .concat((await runWorker({ type: 'readcwd' }))
      .files
      .filter(file => (imageEndings.includes(file.split('.')[1]) && !fileNames.includes(file)))))]
  return () => images.pop()
}

// Function that handles if the output is a string, and file, or an image
async function getCheckValues (ins) {
  const { run, file, getName } = ins

  const expected = file?.data !== undefined
    ? Uint8Array.from(atob(file.data), c => c.charCodeAt(0))
    : (file?.name !== undefined
        ? file?.value
        : run?.output)?.replace(/^\n+|\n+$/g, '') ?? ''

  const imageName = expected instanceof Uint8Array ? getName() : new Error('No Image Name')

  const actual = expected instanceof Uint8Array
    ? (await runWorker({ type: 'analyzePath', fileName: imageName })).exists
        ? (await runWorker({ type: 'readFile', fileName: imageName })).file
        : new Error('No Image Found')
    : (file?.name !== undefined
        ? (await runWorker({ type: 'analyzePath', fileName: file.name })).exists
            ? (await runWorker({ type: 'readFile', fileName: file.name, encoding: 'utf8' })).file
            : new Error('No File Found')
        : (await getOutput(run?.hidden))?.output ?? (await getOutput(run?.hidden))).replace(/^\n+|\n+$/g, '')
  return { expected, actual }
}

// Function that interleaves user input and output
async function interleave () {
  return await runCode(`
import builtins

# Save the original input function so it can still be used
original_input = builtins.input

# Define the custom input function
def custom_input(prompt=""):
    user_input = original_input(prompt)  # Call the original input function
    print(f"〈{user_input}〉")  # Print the input back to the user
    return user_input  # Return the input

# Override the built-in input function
input = custom_input`)
}

// Function that compares the given output with the expected output and update all nessasary variables
async function check (ins) {
  let { actual, expected, attributes } = ins
  if (actual === '') return { pf: undefined }

  if (expected instanceof Uint8Array && actual instanceof Uint8Array) return await processAsImages(expected, actual)

  if (attributes?.ignorespace === true) {
    [actual, expected] = normalizeWS(actual, expected)
  }

  if (!Number.isNaN(+expected) && !Number.isNaN(+actual)) {
    const tolerance = attributes?.tolerance || 1e-6
    return Math.abs(+expected - +actual) <= tolerance ? { pf: 'pass' } : { pf: 'fail' }
  }

  const maxlen = attributes?.maxoutputlen || 100000
  expected = expected?.slice(0, maxlen)?.trim()
  actual = actual?.slice(0, maxlen)?.trim()
  return (attributes?.ignorespace
    ? expected.equalsIgnoreCase(actual)
    : expected === actual)
    ? { pf: 'pass' }
    : { pf: 'fail' }
}

async function processAsImages (expected, actual) {
  const expectedImage = await createImageBitmap(new Blob([expected]))
  const actualImage = await createImageBitmap(new Blob([actual]))

  const expectedImageData = extractPixelData(expectedImage)
  const actualImageData = extractPixelData(actualImage)

  return actualImageData.length === expectedImageData.length &&
  actualImageData.every((val, idx) => val === expectedImageData[idx]) //* Check that every pixel's RGBA values match
    ? { pf: 'pass' }
    : { pf: 'fail', imageDiff: getImageDiffs(expectedImage, actualImage) }
}

//! The Uint8Arrays weren't matching, so this function is used to get the exact pixel data and compare those
function extractPixelData (imageBitmap) {
  // Create a temporary offscreen canvas
  const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = offscreenCanvas.getContext('2d')

  // Draw the image on the offscreen canvas
  ctx.drawImage(imageBitmap, 0, 0)

  // Get image data (pixel data)
  const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height)
  return imageData.data // returns an array of RGBA values
}

function getImageDiffs (expected, actual) {
  if (!expected || !actual) return 'Missing Image'
  if (!(expected.width === actual.width && expected.height === actual.height)) return 'Sizes do not match'

  // Create hidden canvases
  const canvasExpected = new OffscreenCanvas(expected.width, expected.height)
  const canvasActual = new OffscreenCanvas(actual.width, actual.height)
  const canvasDiff = new OffscreenCanvas(expected.width, expected.height)

  // Get contexts
  const ctxExpected = canvasExpected.getContext('2d')
  const ctxActual = canvasActual.getContext('2d')
  const ctxDiff = canvasDiff.getContext('2d')

  // Draw images onto their respective canvases
  ctxExpected.drawImage(expected, 0, 0)
  ctxActual.drawImage(actual, 0, 0)

  // Get image data
  const expectedImgData = ctxExpected.getImageData(0, 0, canvasExpected.width, canvasExpected.height)
  const actualImgData = ctxActual.getImageData(0, 0, canvasActual.width, canvasActual.height)
  const diffData = ctxDiff.createImageData(canvasDiff.width, canvasDiff.height)

  const THRESHOLD = 200
  const MAXCDIFF = 3 * 255 * 255

  // Loop through every pixel
  for (let y = 0; y < canvasDiff.height; y++) {
    for (let x = 0; x < canvasDiff.width; x++) {
      const index = (y * canvasDiff.width + x) * 4

      let r1 = 255; let g1 = 255; let b1 = 255
      let r2 = 255; let g2 = 255; let b2 = 255

      if (x < expected.width && y < expected.height) {
        r1 = expectedImgData.data[(y * expected.width + x) * 4]
        g1 = expectedImgData.data[(y * expected.width + x) * 4 + 1]
        b1 = expectedImgData.data[(y * expected.width + x) * 4 + 2]
      }

      if (x < actual.width && y < actual.height) {
        r2 = actualImgData.data[(y * actual.width + x) * 4]
        g2 = actualImgData.data[(y * actual.width + x) * 4 + 1]
        b2 = actualImgData.data[(y * actual.width + x) * 4 + 2]
      }

      const dr = r1 - r2
      const dg = g1 - g2
      const db = b1 - b2

      const cdiff = dr * dr + dg * dg + db * db

      let r = 255; let g = 255; let b = 255
      if (cdiff !== 0) {
        const gray = THRESHOLD - Math.floor((THRESHOLD * cdiff) / MAXCDIFF)
        r = 255
        g = gray
        b = gray
      }

      diffData.data[index] = r
      diffData.data[index + 1] = g
      diffData.data[index + 2] = b
      diffData.data[index + 3] = 255 // Fully opaque
    }
  }

  ctxDiff.putImageData(diffData, 0, 0)

  // Convert canvas to PNG Uint8Array
  return canvasDiff.convertToBlob({ type: 'image/png' })
    .then(blob => blob.arrayBuffer())
    .then(buffer => new Uint8Array(buffer))
}

function normalizeWS (...strings) {
  const newStrings = strings.map(string => string.replace(/\s+/g, ' ').trim())
  return (newStrings.length === 1) ? newStrings[0] : newStrings
}

function getSuffix (s) {
  let n = s.indexOf(':')
  if (n === -1) {
    return s
  } else {
    if (n + 1 < s.length && s.charAt(n + 1) === ' ') n++
    return s.substring(n + 1)
  }
}
