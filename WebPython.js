/* eslint no-undef: off, no-unused-vars: off, eqeqeq: off
    -------------
    no-undef is off because loadPyodide doesn't need to be declared locally
    no-unused-vars is off because the function Python is written in this file but called from another
    eqeqeq if off so that an int can be comapred to a string */

let stdoutOLD = [] // Array to store all past outputs (by line)
let OUTPUT, pyodide, addText, setText // Variables that need to be global

window.addEventListener('load', async () => {
  function resize (area) { // Function to resize a text area
    // Reset the height to recalculate the correct scroll height
    area.style.height = 'auto'
    // Set the height to the scroll height to fit the content
    area.style.height = `${area.scrollHeight}px`
  }

  addText = (text, area) => { // Function to add text to a text area and resize it
    area.value += text
    resize(area)
  }
  setText = (text, area) => { // Function to set the text of a text area and resize it
    area.value = text
    resize(area)
  }

  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup[0].description // Set the description of the task
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
    pyodide.runPython('import sys\nimport io\nsys.stdout = io.StringIO()')
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
    const name = Object.keys(setup.requiredFiles)[i] // Get the name of the file
    const code = params[name] // Get python code
    // Variables that are needed in every case
    let total = setup.sections[i]?.runs.length
    let pf, output
    let correct = 0

    // Function to initialize the code
    function initialize (input) {
      try {
        console.log(input)
        pyodide.runPython(input) // Run python
      } catch (err) {
        setText(err, OUTPUT)
      }
    }

    // Function to get the output of the python code
    function getOutput () {
      console.log('getting output')
      output = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
      stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs
      if (output === '') return OUTPUT.value
      addText(output + '\n', OUTPUT)
      return output
    }

    // Function to compare the given output with the expected output and update all nessasary variables
    function check (expectedOutput, output, weight) {
      total += weight - 1 // Used for the unit test to show the correct number of test, can be used if you want to weigh one input more than another
      if (expectedOutput != output) { // Check if output was correct
        return 'fail'
      }
      correct += weight
      return 'pass'
    }

    function useFiles (unitTest) {
      // Run any other needed files
      if (setup.useFiles !== undefined) {
        const fileName = name.slice(0, -3) // Get the user's file's name
        // Remove any importing of the user's file because it's functions were initialized
        let newCode = Object.values(setup.useFiles)[0]
          .replace(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g'), '')
          .replace(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm'), (match, p1, p2, p3) =>
            p1.replace(new RegExp(`\\b${fileName}\\b`), '').replace(/,\s*$/, '')
          )
          .replace(new RegExp(`\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`, 'g'), '')
        newCode += unitTest ? '\ntry:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())' : ''
        pyodide.runPython(newCode)
      }
    }
    function parsons () {
      report += `<p class="header run">Running ${name}</p>\n<div class="run">
      <table class="run">
      <tr><th>&#160;</th><th>Actual</th><th>Expected</th></tr>\n`
      for (let j = 0; j < setup.sections[i].runs.length; j++) {
        try {
          pyodide.runPython(code)
          console.log('ran', i, j)
          const outputs = getOutput()
          const expectedOutputs = setup.sections[i].runs[j].output
          pf = check(expectedOutputs, outputs, 1)
          report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${outputs}
            </pre></td>
            <td><pre>${expectedOutputs}
            </pre></td>
            </tr>\n`
        } catch (err) {
          setText(err, OUTPUT)
        }
      }
      report += '</table>'
    }
    function run () {
      report += `<p class="header run">Running ${name}</p>\n<div class="run">
      <table class="run">
      <tr><th>&#160;</th><th>Actual</th><th>Expected</th></tr>\n`
      // Itterrate over the runs array
      for (let j = 0; j < setup.sections[i].runs.length; j++) {
        const inputs = setup.sections[i].runs[j].input?.split('\n') // Get the inputs

        try {
          if (code.indexOf('input') !== -1) {
          // Replace a user input with a computer input
            const newStr = 'next(inputs)'
            let newCode = `inputs = iter([${inputs}])\n${code}`
            code.match(/input\((.*?)\)/g).forEach(str => {
              const index = newCode.indexOf('\n', newCode.indexOf(str) + str.length)
              const variable = newCode.match(/(\b\w+\b)\s*=\s*.*?\binput\(/)[1]
              newCode = newCode.slice(0, index) + `${newCode.slice(index).match(/^\s*/)[0]}print(f"${str.slice(7, -2)}{${variable}}")` + newCode.slice(index) // Print the input question and inputed value
              newCode = newCode.replace(/input\((.*?)\)/, newStr) // Switch user input to computer input
            })

            pyodide.runPython(newCode) // Run each testcase
          } else {
            initialize(code) // Run each testcase
          }
          useFiles()
          const outputs = getOutput()
          const expectedOutputs = setup.sections[i].runs[j].output
          pf = check(expectedOutputs, outputs, 1)
          report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${outputs}
            </pre></td>
            <td><pre>${expectedOutputs}
            </pre></td>
            </tr>\n`
        } catch (err) {
          setText(err, OUTPUT)
        }
      }
      report += '</table>'
    }
    function call () {
      report += `<p class="header call">Calling with Arguments</p>
      <div class="call">
      <table class="run">
      <tr><th>&#160;</th><th>Name</th><th>Arguments</th><th>Actual</th><th>Expected</th></tr>\n`
      initialize(code)
      // Itterrate over the runs array
      for (let j = 0; j < setup.sections[i].runs.length; j++) {
        const func = setup.sections[i].runs[j].caption // Get function name
        const input = setup.sections[i].runs[j].args[0].value // Get the inputs
        try {
          pyodide.runPython(`print(${func}(${input}))`) // Run each testcase
          const output = getOutput()
          const expectedOutput = setup.sections[i].runs[j].output
          pf = check(expectedOutput, output, 1)
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
      }
      report += '</table>'
    }
    function sub () {
      report += `<p class="header sub">Running program with substitutions</p>
      <div class="sub">
      <table class="run">
      <tr><th>&#160;</th><th>Name</th>`
      for (arg of setup.sections[i].runs[0].args) {
        report += `<th>${arg.name}</th>`
      }
      report += '<th>Actual</th><th>Expected</th></tr>\n'
      // Itterate over the runs array
      for (let j = 0; j < setup.sections[i].runs.length; j++) {
        try {
          let newCode = code // Copy the code
          // Replace the variables with their new values
          for (arg of setup.sections[i].runs[j].args) {
            newCode = newCode.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`)
          }
          pyodide.runPython(newCode) // Run each testcase
          const output = getOutput()
          const expectedOutput = setup.sections[i].runs[j].output
          pf = check(expectedOutput, output, 1)
          report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${name.split('.')[0]}</pre></td>`
          for (arg of setup.sections[i].runs[j].args) {
            report += `<td><pre>${arg.value}</pre></td>`
          }
          report += `<td><pre>${output}\n</pre></td>\n<td><pre>${expectedOutput}\n</pre></td>\n</tr>\n`
        } catch (err) {
          setText(err, OUTPUT)
        }
      }
      report += '</table>'
    }
    function unitTest () { // FIXME: Breaks if use was wrong
      report += '<p class="header unitTest">Unit Tests</p>\n<div class="run">'
      // Iterrate over runs array
      for (let j = 0; j < setup.sections[i].runs.length; j++) {
        try {
          initialize(code)
          useFiles(true)
          pf = check('OK', OUTPUT.value.split('\n')[4], parseInt(OUTPUT.value.split('\n')[2].match(/\d+/)[0]))
        } catch (err) {
          setText(err, OUTPUT)
        }
      }
      report += `<span class=${pf}>${pf}</span>`
    }
    function tester () {
      report += '<p class="header tester">Testers</p>\n<div class="run">'
      // Iterrate over runs array
      for (let j = 0; j < setup.sections[i].runs.length; j++) {
        try {
          initialize(code)
          useFiles()
          let HTMLoutput = '<pre class=\'output\'>'
          const expectedOutputs = setup.sections[i].runs[j].output.split('\n').filter(n => n)
          const outputs = getOutput().split('\n')
          for (let k = 0; k < expectedOutputs.length; k++) {
            pf = check(expectedOutputs[k], outputs[k], 1)
            HTMLoutput += `${outputs[k]}\n<span class=${pf}>${expectedOutputs[++k]}</span>\n`
            report += `<span class=${pf}>${pf}</span> `
          }
          total = outputs.length / 2
          report += HTMLoutput
        } catch (err) {
          setText(err, OUTPUT)
        }
      }
    }
    switch (setup.sections[i].type) { // TODO: work on test case 5
      case 'call':
        call()
        break
      case 'parsons':
        parsons()
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
