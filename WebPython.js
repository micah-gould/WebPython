/* TODO:
Deal with timeout */

/* eslint no-undef: off, no-unused-vars: off
    -------------
    no-undef is off because loadPyodide doesn't need to be declared locally
    no-unused-vars is off because the function Python is written in this file but called from another */

let stdoutOLD = [] // Array to store all past outputs (by line)
let stderrOLD = [] // Array to store all past errors (by line)
let OUTPUT, addText, setText, pyodide // Variables that need to be global

window.addEventListener('load', async () => {
  function resize (area) { // Function to resize a text area
    area.style.height = 'auto' // Reset the height to recalculate the correct scroll height
    area.style.height = `${area.scrollHeight}px` // Set the height to the scroll height to fit the content
  }

  addText = (text, area) => { // Function to add text to a text area and resize it
    area.value = (area.value + text)?.trim()
    resize(area)
  }

  setText = (text, area) => { // Function to set the text of a text area and resize it
    area.value = text
    resize(area)
  }

  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup?.[0]?.description ?? '' // Set the description of the task
  OUTPUT = document.getElementById('output') // Get the text area for the output

  addText('Pyodide loading', OUTPUT) // Inform the user that Pyodide is loading

  const START = Date.now() // Get the current time
  // Load Pyodide
  pyodide = await loadPyodide()

  // Capture the Pyodide output
  try {
    pyodide.runPython('import sys\nimport io\nsys.stdout = io.StringIO()\nsys.stderr = io.StringIO()')
  } catch (err) {
    setText(`${err}\n${getOutput().err}`, OUTPUT)
  }

  const END = Date.now() // Get the current time
  addText(`\nPyodide loaded in ${END - START}ms`, OUTPUT) // Inform the user that Pyodide has loaded
})

// Function that process the problems
async function python (setup, params) {
  // Generic HTML for every case
  let report = `<?xml version="1.0" encoding="utf-8"?>
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
  <style type="text/css">
  .header {font-weight: bold; font-size: 1.2em; }
  .item {font-weight: bold;}
  .pass {color: green;}
  .fail {color: red;}
  .note {color: blue; font-weight: bold;}
  table.file td {padding-right: 1em; background: #FFF; }
  .linenumber {color: gray;}
  .footnote {font-size: 0.7em;}
  table {font-size: 0.9em;}
  td, th { background: #EEE; margin: 0.5em; padding: 0.25em;}
  table.output td {vertical-align: top;}
  div.footnotes { border-top: 1px solid gray; padding-top: 0.5em; }
  </style>
  <title>Report</title>
  </head>
  <body>`
  // Itterate over each section
  for (let i = 0; i < setup.sections.length; i++) {
    OUTPUT.value = '' // Clear output

    // Variables that are needed in every case
    let code, pf, output, j, name
    let total = setup.sections[i]?.runs.length
    let correct = 0
    const endstr = '</table>'
    const otherFiles = { ...(setup?.useFiles ?? {}), ...(setup?.hiddenFiles ?? {}) }
    const allFiles = Object.fromEntries(Object.entries({ ...params, ...otherFiles }).filter(([key]) => key.includes('.')))

    // Iterrate over runs array
    for (j = 0; j < setup.sections[i].runs.length; j++) {
      name = setup.sections[i].runs[j].mainclass // Get the name of the file
      code = allFiles[name] // Get python code

      for (const filename in allFiles) {
        try {
          pyodide.FS.writeFile(filename, allFiles[filename])
        } catch (err) {
          setText(`${err}\n${getOutput().err}`, OUTPUT)
        }
      }

      const checks = checkRequiredForbidden(code)
      if (checks.result === true) {
        addText(checks.message ?? '', OUTPUT)
        break
      }

      if (setup.sections[i].runs[j]?.args?.filter(arg => arg.name === 'Command line arguments').length > 0) {
        const args = setup.sections[i].runs[j].args.filter(arg => arg.name === 'Command line arguments')?.map(arg => arg?.value?.split(' '))?.flat()
        args?.unshift(name)
        pyodide.runPython(`sys.argv = ${pyodide.toPy(args)}`)
      }

      const functions = { call, run, sub, unitTest, tester }
      functions[setup.sections[i].type]?.() ?? console.error('Function not found')
    }

    function checkRequiredForbidden (file) {
      let result = false
      return {
        message: setup.conditions?.forEach(test => {
          if (file === params[test.path]) {
            if (test?.forbidden === true) {
              if (new RegExp(test.regex).test(file)) {
                result = true
                return test?.message
              }
            } else {
              if (!new RegExp(test.regex).test(file)) {
                result = true
                return test?.message
              }
            }
          }
        }),
        result
      }
    }

    function call () {
      const str = `<p class="header call">Calling with Arguments</p>
      <div class="call">
      <table class="run">
      <tr><th>&#160;</th><th>Name</th><th>Arguments</th><th>Actual</th><th>Expected</th></tr>\n`
      report += report.includes(str) ? '' : str

      initialize(code)
      runDependents()

      const func = setup.sections[i].runs[j].caption // Get function name
      const input = setup.sections[i].runs[j].args.filter(arg => arg.name === 'Arguments')[0].value // Get the inputs
      try {
        pyodide.runPython(`print(${func}(${input}))`) // Run each testcase

        for (let z = 0; z < (setup.sections[i].runs[j]?.files?.length ?? 1); z++) {
          const output = (getOutput().output ?? getOutput()) || pyodide.FS.readFile(setup.sections[i].runs[j]?.files?.[z]?.name, { encoding: 'utf8' })
          const expectedOutput = setup.sections[i].runs[j].output || setup.sections[i].runs[j]?.files?.[z]?.value
          pf = check(expectedOutput, output)
          report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${name?.split('.')[0]}</pre></td>
            <td><pre>${input}</pre></td>
            <td><pre>${output}
            </pre></td>
            <td><pre>${expectedOutput}
            </pre></td>
            </tr>\n`
        }
      } catch (err) {
        setText(`${err}\n${getOutput().err}`, OUTPUT)
      }

      report += j === setup.sections[i].runs.length - 1 ? endstr : ''
      return true
    }

    function run () {
      const str = `<p class="header run">Running ${name}</p>\n<div class="run">
      <table class="run">
      <tr><th>&#160;</th><th>Actual</th><th>Expected</th></tr>\n`
      report += report.includes(str) ? '' : str

      const inputs = setup.sections[i].runs[j].input?.split('\n') // Get the inputs

      try {
        if (code.indexOf('input') !== -1) {
          // Replace a user input with a computer input
          const newStr = 'next(inputs)'
          let newCode = `inputs = iter([${inputs}])\n${code}`
          code?.match(/input\((.*?)\)/g)?.forEach(str => {
            const index = newCode?.indexOf('\n', newCode?.indexOf(str) + str.length)
            const variable = newCode?.match(/(\b\w+\b)\s*=\s*.*?\binput\(/)[1]
            newCode = newCode?.slice(0, index) +
                      `${newCode?.slice(index)?.match(/^\s*/)[0]}print(f"${str?.slice(7, -2)}{${variable}}")` +
                      newCode?.slice(index) // Print the input question and inputed value
            newCode = newCode?.replace(/input\((.*?)\)/, newStr) // Switch user input to computer input
          })

          pyodide.runPython(newCode) // Run each testcase
        } else {
          initialize(code) // Run each testcase
        }
        runDependents()

        for (let z = 0; z < (setup.sections[i].runs[j]?.files?.length ?? 1); z++) {
          const output = (getOutput().output ?? getOutput()) || pyodide.FS.readFile(setup.sections[i].runs[j]?.files?.[z]?.name, { encoding: 'utf8' })
          const expectedOutput = setup.sections[i].runs[j].output || setup.sections[i].runs[j]?.files?.[z]?.value
          pf = check(expectedOutput, output)
          report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${output}
            </pre></td>
            <td><pre>${expectedOutput}
            </pre></td>
            </tr>\n`
        }
      } catch (err) {
        setText(`${err}\n${getOutput().err}`, OUTPUT)
      }

      report += j === setup.sections[i].runs.length - 1 ? endstr : ''
      return true
    }

    function sub () {
      let str1 = `<p class="header sub">Running program with substitutions</p>
      <div class="sub">
      <table class="run">
      <tr><th>&#160;</th><th>Name</th>`

      args = setup.sections[i].runs[j].args.filter(arg => !['Arguments', 'Command line arguments'].includes(arg.name))

      for (arg of args) {
        str1 += `<th>${arg.name}</th>`
      }
      str1 += '<th>Actual</th><th>Expected</th></tr>\n'
      report += report.includes(str1) ? '' : str1

      try {
        let newCode = code // Copy the code
        // Replace the variables with their new values
        for (arg of args) {
          newCode = newCode?.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`)
        }
        pyodide.runPython(newCode) // Run each testcase
        runDependents()

        for (let z = 0; z < (setup.sections[i].runs[j]?.files?.length ?? 1); z++) {
          const output = (getOutput().output ?? getOutput()) || pyodide.FS.readFile(setup.sections[i].runs[j]?.files?.[z]?.name, { encoding: 'utf8' })
          const expectedOutput = setup.sections[i].runs[j].output || setup.sections[i].runs[j]?.files?.[z]?.value
          pf = check(expectedOutput, output)
          report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${name?.split('.')[0]}</pre></td>`
          for (arg of args) {
            report += `<td><pre>${arg.value}</pre></td>`
          }
          report += `<td><pre>${output}\n</pre></td>\n<td><pre>${expectedOutput}\n</pre></td>\n</tr>\n`
        }
      } catch (err) {
        setText(`${err}\n${getOutput().err}`, OUTPUT)
      }

      report += j === setup.sections[i].runs.length - 1 ? endstr : ''
      return true
    }

    function unitTest () {
      const str = '<p class="header unitTest">Unit Tests</p>\n<div class="run">'
      report += report.includes(str) ? '' : str
      try {
        initialize(code)
        runDependents(true)
        total = (setup.sections[i].runs[j].output?.split('\n')[0]?.match(/\./g) || []).length
        correct = total - (getOutput().err?.split('\n')[0]?.match(/F/g) || []).length
        if (setup.sections[i].runs[j]?.files?.length > 0) {
          console.log('FILES') // FIXME: figure out how to deal with unittest in this case if needed
        } else {
          pf = correct === total ? 'pass' : 'fail'
        }
      } catch (err) {
        setText(`${err}\n${getOutput().err}`, OUTPUT)
      }

      report += `<span class=${pf}>${pf}</span>`
      return true
    }

    function tester () {
      const str = '<p class="header tester">Testers</p>\n<div class="run">'
      report += report.includes(str) ? '' : str

      initialize(code)
      runDependents()
      let HTMLoutput = '<pre class=\'output\'>'
      const expectedOutputs = setup.sections[i].runs[j].output?.split('\n').filter(n => n)
      const outputs = getOutput().output?.split('\n')
      for (let k = 0; k < expectedOutputs.length; k++) {
        if ((setup.sections[i].runs[j]?.files?.length ?? 0) > 0) {
          console.log('FILES') // FIXME: figure out how to deal with unittest in this case if needed
        } else {
          pf = check(expectedOutputs[k], outputs[k])
          HTMLoutput += `${outputs[k]}\n<span class=${pf}>${expectedOutputs[++k]}</span>\n`
          report += `<span class=${pf}>${pf}</span> `
        }
      }
      total = outputs.length / 2
      report += HTMLoutput

      return true
    }

    // Function to initialize the code
    function initialize (input) {
      try {
        pyodide.runPython(input) // Run each testcase
      } catch (err) {
        setText(`${err}\n${getOutput().err}`, OUTPUT)
      }
    }

    // Function to get the output of the python code
    function getOutput () {
      output = pyodide.runPython('sys.stdout.getvalue()')
        .split('\n')
        .slice(stdoutOLD.length, -1)
        .join('\n') // Get the new outputs
      stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs

      err = pyodide.runPython('sys.stderr.getvalue()')
        .split('\n')
        .slice(stderrOLD.length, -1)
        .join('\n') // Get the new errors
      stderrOLD = stderrOLD.concat(err.split('\n')) // Add the new errors to the list of old errors

      if (output === '' && err === '') return OUTPUT.value
      addText(`\n${output}\n${err}`, OUTPUT)
      return { output, err }
    }

    // Function to compare the given output with the expected output and update all nessasary variables
    function check (expectedOutput, output, weight = 1) {
      const tolerance = setup?.attributes?.tolerance ?? 0.000001
      total += weight - 1 // Used for the unit test to show the correct number of test, can be used if you want to weigh one input more than another
      if (setup?.attributes?.ignorecase === true) {
        output = output.toLowerCase() // Closest JS equivlent to equalsIgnoreCase
        expectedOutput = expectedOutput.toLowerCase()
      }
      if (setup?.attributes?.ignorespace === true) {
        output = output?.replace(/\s+/g, '') // Equivlent to normalizeWS from java
        expectedOutput = expectedOutput?.replace(/\s+/g, '')
      }
      if (Number.isFinite(Number(output))) {
        output = Math.round(output / tolerance) * tolerance // Server uses different method but I like this better
        expectedOutput = Math.round(expectedOutput / tolerance) * tolerance
      } else {
        expectedOutput = expectedOutput?.trim()
        output = output?.trim()
      }
      if (expectedOutput !== output) { // Check if output was correct
        return 'fail'
      }
      correct += weight
      return 'pass'
    }

    function runDependents (unitTest = false) {
      // Run any other needed files
      if (Object.keys(otherFiles).length === 0) return

      const fileName = name?.replace('.py', '') // Get the user's file's name

      // Remove any importing of the user's file because it's functions were initialized
      for (file of Object.values(otherFiles)) {
        const checks = checkRequiredForbidden(file)
        if (checks.result === true) {
          addText(checks.message ?? '', OUTPUT)
          break
        }
        if (!(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g')).test(file) &&
            !(new RegExp(`^(import\\s+.*?)\\b${fileName?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm')).test(file)) continue

        const newCode = file + (unitTest === true ? '\ntry:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())' : '')

        try {
          pyodide.runPython(newCode)
        } catch (err) {
          setText(`${err}\n${getOutput().err}`, OUTPUT)
        }
      }
    }

    report += `</div>
    <p class="header studentFiles">Submitted files</p>
    <div class="studentFiles">
    <p class="caption">${name}:</p>
    <pre class="output">${code}
    </pre>
    </div>
    <p class="header providedFiles">Provided files</p>
    <div class="providedFiles">`
    if (setup.useFiles !== undefined) {
      for ([key, file] of Object.entries(setup.useFiles)) {
        report += `<p class="caption">${key}:</p>
        <pre class="output">${file}
        </pre>`
      }
    }
    report += `</div>
    <p class="header score">Score</p>
    <div class="score">
    <p class="score">${correct}/${total}</p>
    </div>
    </div>`
  }
  report += '</body></html>'
  return { report }
}
