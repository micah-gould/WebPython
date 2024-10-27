/* TODO:
Read about virtual file system
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
    area.value = (area.value + text).trim()
    resize(area)
  }

  setText = (text, area) => { // Function to set the text of a text area and resize it
    area.value = text
    resize(area)
  }

  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup[0]?.description ?? '' // Set the description of the task
  OUTPUT = document.getElementById('output') // Get the text area for the output

  setText('Pyodide loading', OUTPUT) // Inform the user that Pyodide is loading
  const START = Date.now() // Get the current time

  // Load Pyodide
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/', // Make sure this is the correct version of pyodide
    stdout: (msg) => { addText(`Pyodide: ${msg}\n`, OUTPUT) },
    stderr: (msg) => { addText(`${msg}\n`, OUTPUT) } // Unit Test raise the output as warning, so this redirects them to the output
  })
  // Capture the Pyodide output
  try {
    pyodide.runPython('import sys\nimport io\nsys.stdout = io.StringIO()\nsys.stderr = io.StringIO()')
  } catch (err) {
    setText(err, OUTPUT)
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

    // Iterrate over runs array
    for (j = 0; j < setup.sections[i].runs.length; j++) {
      name = setup.sections[i].runs[j].mainclass // Get the name of the file
      code = params[name] // Get python code

      const checks = checkRequiredForbidden(code)
      if (checks.result === true) {
        addText(checks.message ?? '', OUTPUT)
        break
      }
      setup.sections[i].runs[j]?.args?.forEach(arg => {
        if (arg.name === 'Command line arguments') {
          code = code.replace(/sys\.argv\[(\d+)\]/g, (match, p1) => {
            return arg.value.split(' ')[p1 - 1]
          })
        }
      })

      code = runDependencies(code)

      switch (setup.sections[i].type) { // TODO: work file system
        case 'call':
          call()
          break
        case 'run':
          run()
          break
        case 'sub':
          sub()
          break
        case 'unitTest':
          unitTest()
          break
        case 'tester':
          tester()
          break
      }
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

    function runDependencies (oldCode) {
      // Run any dependent files
      const files = []

      const newCode = oldCode
        .replace(/from\s+(.*?)\s+import\s+\w+/g, (_, x) => {
          files.push(x)
          return ''
        })
        .replace(/import\s+([^\n]+)/g, (_, imports) =>
          'import ' + imports.split(',').map(item => (item.trim())).filter(item => {
            if (params[item + '.py'] !== undefined || otherFiles?.[item + '.py'] !== undefined) {
              files.push(item) // Log if found in arr1 or arr2
              return false // Remove from final string
            }
            return true // Keep if not in arr1 or arr2
          }).join(', ')
        )
        .replace(/\b(\w+)\.(\w+)\b/g, (match, x, y) => {
          if (files.includes(x)) {
            return y // Return only y if x is in the array
          }
          return match // Keep x.y if x is not in the array
        })

      files.forEach(file => {
        initialize(runDependencies(params[file + '.py'] ?? otherFiles?.[file + '.py']))
      })

      return newCode
    }

    function call () {
      const str = `<p class="header call">Calling with Arguments</p>
      <div class="call">
      <table class="run">
      <tr><th>&#160;</th><th>Name</th><th>Arguments</th><th>Actual</th><th>Expected</th></tr>\n`
      report += report.includes(str) ? '' : str

      initialize(code)

      const func = setup.sections[i].runs[j].caption // Get function name
      const input = setup.sections[i].runs[j].args.filter(arg => arg.name === 'Arguments')[0].value // Get the inputs
      try {
        pyodide.runPython(`print(${func}(${input}))`) // Run each testcase
        const output = getOutput().output
        const expectedOutput = setup.sections[i].runs[j].output
        pf = check(expectedOutput, output)
        report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${name.split('.')[0]}</pre></td>
            <td><pre>${input}</pre></td>
            <td><pre>${output}
            </pre></td>
            <td><pre>${expectedOutput}
            </pre></td>
            </tr>\n`
      } catch (err) {
        setText(err, OUTPUT)
      }

      report += j === setup.sections[i].runs.length - 1 ? endstr : ''
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
          code.match(/input\((.*?)\)/g).forEach(str => {
            const index = newCode.indexOf('\n', newCode.indexOf(str) + str.length)
            const variable = newCode.match(/(\b\w+\b)\s*=\s*.*?\binput\(/)[1]
            newCode = newCode.slice(0, index) +
                      `${newCode.slice(index).match(/^\s*/)[0]}print(f"${str.slice(7, -2)}{${variable}}")` +
                      newCode.slice(index) // Print the input question and inputed value
            newCode = newCode.replace(/input\((.*?)\)/, newStr) // Switch user input to computer input
          })

          pyodide.runPython(newCode) // Run each testcase
        } else {
          initialize(code) // Run each testcase
        }
        runDependents()
        const outputs = getOutput().output
        const expectedOutputs = setup.sections[i].runs[j].output
        pf = check(expectedOutputs, outputs)
        report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${outputs}
            </pre></td>
            <td><pre>${expectedOutputs}
            </pre></td>
            </tr>\n`
      } catch (err) {
        setText(err, OUTPUT)
      }

      report += j === setup.sections[i].runs.length - 1 ? endstr : ''
    }

    function sub () {
      let str1 = `<p class="header sub">Running program with substitutions</p>
      <div class="sub">
      <table class="run">
      <tr><th>&#160;</th><th>Name</th>`

      args = setup.sections[i].runs[i].args.filter(arg => !['Arguments', 'Command line arguments'].includes(arg.name))

      for (arg of args) {
        str1 += `<th>${arg.name}</th>`
      }
      str1 += '<th>Actual</th><th>Expected</th></tr>\n'
      report += report.includes(str1) ? '' : str1

      try {
        let newCode = code // Copy the code
        // Replace the variables with their new values
        for (arg of args) {
          newCode = newCode.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`)
        }
        pyodide.runPython(newCode) // Run each testcase
        const output = getOutput().output
        const expectedOutput = setup.sections[i].runs[j].output
        pf = check(expectedOutput, output)
        report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${name.split('.')[0]}</pre></td>`
        for (arg of args) {
          report += `<td><pre>${arg.value}</pre></td>`
        }
        report += `<td><pre>${output}\n</pre></td>\n<td><pre>${expectedOutput}\n</pre></td>\n</tr>\n`
      } catch (err) {
        setText(err, OUTPUT)
      }

      report += j === setup.sections[i].runs.length - 1 ? endstr : ''
    }

    function unitTest () {
      const str = '<p class="header unitTest">Unit Tests</p>\n<div class="run">'
      report += report.includes(str) ? '' : str
      try {
        initialize(code)
        runDependents(true)
        total = (setup.sections[i].runs[j].output.split('\n')[0].match(/\./g) || []).length
        correct = total - (getOutput().err.split('\n')[0].match(/F/g) || []).length
        pf = correct === total ? 'pass' : 'fail'
      } catch (err) {
        setText(err, OUTPUT)
      }

      report += `<span class=${pf}>${pf}</span>`
    }

    function tester () {
      const str = '<p class="header tester">Testers</p>\n<div class="run">'
      report += report.includes(str) ? '' : str

      try {
        initialize(code)
        runDependents()
        let HTMLoutput = '<pre class=\'output\'>'
        const expectedOutputs = setup.sections[i].runs[j].output.split('\n').filter(n => n)
        const outputs = getOutput().output.split('\n')
        for (let k = 0; k < expectedOutputs.length; k++) {
          pf = check(expectedOutputs[k], outputs[k])
          HTMLoutput += `${outputs[k]}\n<span class=${pf}>${expectedOutputs[++k]}</span>\n`
          report += `<span class=${pf}>${pf}</span> `
        }
        total = outputs.length / 2
        report += HTMLoutput
      } catch (err) {
        setText(err, OUTPUT)
      }
    }

    // Function to initialize the code
    function initialize (input) {
      try {
        pyodide.runPython(input) // Run python
      } catch (err) {
        setText(err, OUTPUT)
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
      addText(`${output}\n${err}`, OUTPUT)
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
        output = output.replace(/\s+/g, '') // Equivlent to normalizeWS from java
        expectedOutput = expectedOutput.replace(/\s+/g, '')
      }
      if (Number.isFinite(Number(output))) {
        output = Math.round(output / tolerance) * tolerance // Server uses different method but I like this better
        expectedOutput = Math.round(expectedOutput / tolerance) * tolerance
      }
      if (expectedOutput !== output) { // Check if output was correct
        return 'fail'
      }
      correct += weight
      return 'pass'
    }

    function runDependents (unitTest) {
      // Run any other needed files
      if (Object.keys(otherFiles).length === 0) return

      const fileName = name.replace('.py', '') // Get the user's file's name

      // Remove any importing of the user's file because it's functions were initialized
      for (file of Object.values(otherFiles)) {
        const checks = checkRequiredForbidden(file)
        if (checks.result === true) {
          addText(checks.message ?? '', OUTPUT)
          break
        }
        if (!(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g')).test(file) &&
            !(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm')).test(file)) continue
        let newCode = file
          .replace(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g'), '')
          .replace(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm'), (match, p1, p2, p3) =>
            p1.replace(new RegExp(`\\b${fileName}\\b`), '').replace(/,\s*$/, '')
          )
          .replace(new RegExp(`\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`, 'g'), '')
        newCode += unitTest ? '\ntry:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())' : ''
        newCode = runDependencies(newCode)
        pyodide.runPython(newCode)
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
