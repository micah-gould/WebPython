/* eslint no-undef: off, no-unused-vars: off
    -------------
!   no-undef is off because loadPyodide doesn't need to be declared locally
!   no-unused-vars is off because the function Python is written in this file but called from another
*/

let stdoutOLD = [] // Array to store all past outputs (by line)
let stderrOLD = [] // Array to store all past errors (by line)
let OUTPUT, worker, fileNames, timeoutId // Variables that need to be global
const imageEndings = ['apng', 'avif', 'bmp', 'cur', 'gif', 'ico', 'jfif', 'jpeg', 'jpg', 'pjp', 'pjpeg', 'png', 'svg', 'webp']

// Function that updates the value of the output and resize it
const updateTextArea = (text, area, append = true) => {
  area.value = append ? (area.value + text).trim() : text
  area.style.height = 'auto'
  area.style.height = `${area.scrollHeight}px`
}

//! Function that handles all python errors
const handleError = async err => {
  if (err.type !== 'SystemExit') { //* Ignore a system.exit()
    updateTextArea(`${err}\n${(await getOutput()).err}`, OUTPUT, false)
  }
}

//! Need to run code through this function and not "worker.postMessage()"
const runWorker = async code => {
  worker.postMessage(code) //* Post the message to the worker
  const result = await new Promise(resolve => { //* Wait for the worker to finsih processing the message
    worker.onmessage = event => {
      clearTimeout(timeoutId) //* If the code ran within the maxtime, clear the timeout
      resolve(event.data)
    }
  })
  return result.success ? result : new Error(result.error)
}

// Function that runs python code
const runCode = async (code, timeout = 30000) => {
  clearTimeout(timeoutId) //* Reset the timeout
  timeoutId = setTimeout(() => {
    worker.terminate() //! Stop the worker if it takes too long
    updateTextArea(`Python code execution timed out after ${timeout} seconds`, OUTPUT, false)
    document.getElementsByClassName('codecheck-submit-response')[0].textContent = 'Max execution time exceeded'
  }, timeout)
  try {
    return await runWorker({ type: 'runCode', code })
  } catch (err) {
    await handleError(err)
  }
}

// Function that gets the output of the python code
const getOutput = async (hidden = false) => {
  const output = (await runCode('sys.stdout.getvalue()'))
    .result
    .split('\n')
    .slice(stdoutOLD.length, -1)
    .join('\n') // Get the new outputs
  stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs

  const err = (await runCode('sys.stderr.getvalue()'))
    .result
    .split('\n')
    .slice(stderrOLD.length, -1)
    .join('\n') // Get the new errors
  stderrOLD = stderrOLD.concat(err.split('\n')) // Add the new errors to the list of old errors

  if (output === '' && err === '') return OUTPUT.value
  updateTextArea(hidden ? '\nHIDDEN' : `\n${output}`, OUTPUT)
  if (!(err.includes('SystemExit')
  )) updateTextArea(`\n${err}`, OUTPUT)
  return { output, err }
}

// Function that sets up Pyodide
const setupPyodide = async () => {
  const firstLoad = worker === undefined

  const buttons = document.querySelectorAll('.codecheckSubmit span')

  // Disable all the buttons
  buttons.forEach(button => {
    button.classList.add('disabled')
  })

  stdoutOLD = []
  stderrOLD = []
  updateTextArea('Pyodide loading', OUTPUT, false) // Inform the user that Pyodide is loading

  const START = Date.now() // Get the current time

  try {
    worker = new Worker('JS/pyodideWorker.js' /* path from the HTML file */) // Load Pyodide
    const END = (await runWorker({ type: 'setup' })).endTime
    updateTextArea(`\nPyodide loaded in ${END - START}ms`, OUTPUT) // Inform the user that Pyodide has loaded
  } catch (err) {
    await handleError(err)
  }

  if (!firstLoad) return

  buttons.forEach(button => {
    button.classList.remove('disabled') // Remove disabled styling
  })
}

// Function that loads Pyodide file system
const loadFiles = async files => {
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
  fileNames = (await runWorker({ type: 'readcwd' })).files
}

// Function that interleaves user input and output
const interleave = async () =>
  await runCode(`
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

//! The Uint8Arrays weren't matching, so this function is used to get the exact pixel data and compare those
const extractPixelData = async imageBitmap => {
  // Create a temporary offscreen canvas
  const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = offscreenCanvas.getContext('2d')

  // Draw the image on the offscreen canvas
  ctx.drawImage(imageBitmap, 0, 0)

  // Get image data (pixel data)
  const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height)
  return imageData.data // returns an array of RGBA values
}

const normalizeWS = (...strings) => {
  const newStrings = strings.map(string => string.replace(/\s+/g, ' ').trim())
  return (newStrings.length === 1) ? newStrings[0] : newStrings
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

const processAsImages = async (expected, actual) => {
  const expectedImage = await createImageBitmap(new Blob([expected]))
  const actualImage = await createImageBitmap(new Blob([actual]))

  const expectedImageData = await extractPixelData(expectedImage)
  const actualImageData = await extractPixelData(actualImage) // TODO: Only show one image if they match.

  return actualImageData.length === expectedImageData.length &&
  actualImageData.every((val, idx) => val === expectedImageData[idx]) //* Check that every pixel's RGBA values match
    ? { pf: 'pass' }
    : { pf: 'fail', imageDiff: await getImageDiffs(expectedImage, actualImage) }
}

// Function that compares the given output with the expected output and update all nessasary variables
const check = async (expectedOutput, output, attributes) => {
  if (output === '') return { pf: undefined }

  if (expectedOutput instanceof Uint8Array && output instanceof Uint8Array) return await processAsImages(expectedOutput, output)

  if (attributes?.ignorespace === true) {
    [output, expectedOutput] = normalizeWS(output, expectedOutput)
  }

  if (!Number.isNaN(+expectedOutput) && !Number.isNaN(+output)) {
    const tolerance = attributes?.tolerance || 1e-6
    return Math.abs(+expectedOutput - +output) <= tolerance ? { pf: 'pass' } : { pf: 'fail' }
  }

  const maxlen = attributes?.maxoutputlen || 100000
  expectedOutput = expectedOutput?.slice(0, maxlen).trim()
  output = output?.slice(0, maxlen).trim()
  return (attributes?.ignorespace
    ? expectedOutput.equalsIgnoreCase(output)
    : expectedOutput === output)
    ? { pf: 'pass' }
    : { pf: 'fail' }
}

// Function that handles if the output is a string, and file, or an image
const getCheckValues = async (run, file, imageName) => [file?.data !== undefined
  ? Uint8Array.from(atob(file.data), c => c.charCodeAt(0))
  : (file?.name !== undefined
      ? file?.value
      : run?.output)?.replace(/^\n+|\n+$/g, '') ?? '',
(await runWorker({ type: 'analyzePath', fileName: imageName })).exists
  ? (await runWorker({ type: 'readFile', fileName: imageName })).file
  : (file?.name !== undefined
      ? (await runWorker({ type: 'analyzePath', fileName: file.name })).exists
          ? (await runWorker({ type: 'readFile', fileName: file.name, encoding: 'utf8' })).file
          : 'No File Found'
      : (await getOutput(run?.hidden))?.output ?? (await getOutput(run?.hidden))).replace(/^\n+|\n+$/g, '')]

// Function that runs all files that call the user's file
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
    } // TODO: can this be less fragaile
    if (!(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g')).test(code) &&
        !(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm')).test(code)) continue

    await runCode(code)
    if (/^(.*(Test|_test)(\d*)\.py)$/.test(file)) await runCode('try:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())')

    if (!/^(.*(Test|_test|Tester|_tester|Runner|_runner)(\d*)\.py)$/.test(file)) alert('Non test ran', file) //! here as a test for now. TEMPORARY
  }
}

// Function that check is the user's code follows all the required and forbiden rules
const checkRequiredForbidden = (file, conditions) => {
  let result = false
  let message = null

  conditions?.forEach(test => {
    if (file !== params[test.path]) return // TODO: what is this?

    const matches = new RegExp(test.regex).test(file)
    if ((test?.forbidden && matches) || (!test?.forbidden && !matches)) {
      result = true
      message = test?.message
    }
  })

  return { message, result }
}

const getImageName = async z => { // TODO: will be fixed
  const newFileNames = (await runWorker({ type: 'readcwd' })).files.filter(file => imageEndings.includes(file.split('.')[1])).filter(file => !fileNames.includes(file))
  const images = fileNames.filter(file => imageEndings.includes(file.split('.')[1]))
  return newFileNames.length > z ? newFileNames[z] : images.length > z ? images[z] : 'noFile'
}

// Function that processes outputs
const processOutputs = async (run, filesAndImages, attributes, report, name, args) => {
  let correct = 0
  let total = 0
  for (let z = -1; z < (filesAndImages?.length ?? 0); z++) {
    const [expectedOutput, output] = await getCheckValues(run, filesAndImages[z], await getImageName(z))
    const { pf, imageDiff } = await check(expectedOutput, output, attributes)
    if (pf === undefined) continue
    correct += pf === 'pass' ? 1 : 0

    report.newRow()
    report.pf(pf)
    if (name) report.info(run?.hidden, name)
    if (args) args.forEach(arg => report.info(run?.hidden, arg.value ?? arg))
    report.closeRow(run?.hidden, pf === 'pass', output, expectedOutput, imageDiff)

    total++
  }
  return { correct, total }
}

const getFilesAndImages = (files, images) => [...Object.entries(files ?? {}).map(([title, data]) => (
  {
    name: title,
    value: data
  })), ...images ?? []]

// Function that runs the "call" case
const call = async ins => {
  const { code, run, name, otherFiles, attributes, end, conditions, report } = ins
  report.newCall()

  await runCode(code, attributes?.timeout)
  await runDependents(name, otherFiles, conditions)

  const func = run.caption // Get function name
  const input = run.args.filter(arg => arg.name === 'Arguments')[0].value // Get the inputs
  await runCode(`print(${func}(${input}))`, attributes?.timeout) // Run each testcase

  const { correct, total } = await processOutputs(run, getFilesAndImages(run?.files, run?.images), attributes, report, func, [input])

  if (end) report.closeTable()
  return { correct, total }
}

// Function that runs the "run" case
const run = async ins => {
  const { code, run, name, otherFiles, attributes, end, conditions, report } = ins

  report.newRun(name)

  const inputs = run.input?.split('\n') ?? '' // Get the inputs

  // Replace a user input with a computer input
  if ((/input\((.*?)\)/).test(code)) await runCode(`sys.stdin = io.StringIO("""${inputs.join('\n')}""")\n`)

  if (attributes?.interleave ?? true) await interleave()

  await runCode(code, attributes?.timeout) // Run each testcase
  await runDependents(name, otherFiles, conditions)

  const { correct, total } = await processOutputs(run, getFilesAndImages(run?.files, run?.images), attributes, report)

  if (end) report.closeTable()
  return { correct, total }
}

// Function that runs the "sub" case
const sub = async ins => {
  const { code, run, name, otherFiles, attributes, end, conditions, report } = ins

  const args = run.args.filter(arg => !['Arguments', 'Command line arguments'].includes(arg.name))
  report.newSub(args)

  // Replace the variables with their new values
  const newCode = args.reduce((acc, arg) => acc.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`), code)

  await runCode(newCode, attributes?.timeout) // Run each testcase
  await runDependents(name, otherFiles, conditions)

  const { correct, total } = await processOutputs(run, getFilesAndImages(run?.files, run?.images), attributes, report, name, args)

  if (end) report.closeTable()
  return { correct, total }
}

// Function that runs the "unitTest" case
const unitTest = async ins => {
  const { run, name, otherFiles, conditions, report } = ins

  report.newUnitTest()

  await runDependents(name, otherFiles, conditions)
  const total = (run.output?.split('\n')?.[0]?.match(/\./g) || []).length
  const correct = ((await getOutput(run?.hidden)).err?.split('\n')?.[0]?.match(/\./g) || []).length
  const pf = correct === total ? 'pass' : 'fail'

  report.pf(pf)
  return { correct, total }
}

// Function that runs the "tester" case
const tester = async ins => {
  const { run, name, otherFiles, conditions, report } = ins
  let correct = 0

  if (run?.hidden !== true) report.newTester()

  await runDependents(name, otherFiles, conditions)
  const tests = report.newTests()
  const expectedOutputs = run.output?.split('\n')?.filter(Boolean)
  const outputs = (await getOutput(run?.hidden)).output?.split('\n')
  for (let k = 0; k < expectedOutputs.length; k++) {
    const pf = (await check(expectedOutputs[k], outputs[k])).pf
    correct += pf === 'pass' ? 1 : 0
    if (run?.hidden !== true) report.pf(pf)
    tests.addTest(outputs[k], expectedOutputs[++k], pf)
  }
  const total = outputs.length / 2 // TODO: check the Java
  if (run?.hidden !== true) tests.append()

  return { correct, total }
}

// Once the window is loaded the decription can be set and the text area for the output can be retrived
window.addEventListener('load', async () => {
  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup
    .map(a => (a?.description ?? ''))
    .join('\n') // Set the description of the task
  OUTPUT = document.getElementById('output') // Get the text area for the output
  await setupPyodide()

  const targetDiv = document.querySelector('.codecheck-submit-response')

  // Create a MutationObserver
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const diffCells = document.querySelectorAll(`${targetDiv.tagName} .diff`)
        if (diffCells.length === 0) document.getElementById('diff-header')?.classList?.add('hidden')

        const expectedCells = document.querySelectorAll(`${targetDiv.tagName} .expected`)
        if (expectedCells.length === 0) document.getElementById('expected-header')?.classList?.add('hidden')
      }
    }
  })

  // Configure the observer to look for changes in child nodes
  observer.observe(targetDiv, { childList: true })
})

//* Code starts here when it is called from horstmann_codecheck.js
async function python (setup, params) {
  const hasBeenLoaded = (await runWorker({ type: 'readcwd' })).files.length > 0 //! If pyodide has been run, the users files would have been loaded
  if (hasBeenLoaded) await setupPyodide() // Load pyodide each time because otherwise there is an issue with the outputs

  updateTextArea('', OUTPUT, false) // Clear the output

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

      const checks = checkRequiredForbidden(code, setup?.conditions) // Check if the user's code follows the required and forbidden riles
      if (checks.result === true) {
        updateTextArea(checks.message ?? '', OUTPUT) // Post the error message to the user
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
      const { correct: newCorrect, total: newTotal } = await functions[section.type]?.({
        code,
        run: currentRun,
        name,
        otherFiles,
        attributes: setup?.attributes,
        conditions: setup?.conditions,
        end: section.runs.indexOf(currentRun) === section.runs.length - 1,
        report
      }) ?? console.error('Function not found') //! Unknown test case type
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

  return { report: report.report }
}
