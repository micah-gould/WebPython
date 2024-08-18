/* eslint no-undef: off, no-unused-vars: off
    -------------
    no-undef is off because loadPyodide doesn't need to be declared locally
    no-unused-vars is off because the function Python is written in this file but called from another */

let stdoutOLD = [] // Array to store all past outputs (by line)
let OUTPUT
let pyodide
let addText
let setText
window.addEventListener('load', async () => {
  addText = function (text, area) {
    area.value += text
    resize(area)
  }
  setText = function (text, area) {
    area.value = text
    resize(area)
  }

  document.getElementById('description').innerHTML += window.horstmann_codecheck.setup[0].description

  OUTPUT = document.getElementById('output')
  setText('Pyodide loading', OUTPUT)
  const START = Date.now()
  // Load Pyodide
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
    stdout: (msg) => { addText(`\nPyodide: ${msg}`, OUTPUT) },
    stderr: (msg) => { addText(`${msg}\n`, OUTPUT) } // Unit Test raise the output as warning, so this redirects them to the output
  })
  // data Pyodide output
  pyodide.runPython(`
  import sys
  import io
  sys.stdout = io.StringIO()
  `)
  const END = Date.now()
  addText(`\nPyodide loaded in ${END - START}ms`, OUTPUT)

  function resize (area) {
    // Reset the height to recalculate the correct scroll height
    area.style.height = 'auto'
    // Set the height to the scroll height to fit the content
    area.style.height = `${area.scrollHeight}px`
  }
})

async function python (setup, params) {
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
  for (let i = 0; i < setup.sections.length; i++) {
    OUTPUT.value = '' // Clear output
    const name = Object.keys(setup.requiredFiles)[i]
    const code = params[name] // Get python code
    let total = setup.sections[i]?.runs.length
    let pf
    let output
    let correct = 0
    function initialize (input) {
      try { // Initialize the code
        pyodide.runPython('print("")')
        pyodide.runPython(input) // Run python
        // This code fixes an issue if the user leaves in any print statemnts in the code
        const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
        stdoutOLD = stdoutOLD.concat(stdout.split('\n')) // Add the new outputs to the list of old outputs
      } catch (err) {
        setText(err, OUTPUT)
      }
    }
    function getOutput () {
      output = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
      stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs
      addText(output + '\n', OUTPUT)
      return outptut
    }
    function check (expectedOutput, output, weight) {
      total += weight - 1
      if (expectedOutput !== output) { // Check if output was correct
        return 'fail'
      }
      correct += weight
      return 'pass'
    }
    switch (setup.sections[i].type) { // TODO: Review all the current methods and make sure they work
      case 'call':
        report += `<p class="header call">Calling with Arguments</p>
        <div class="call">
        <table class="run">
        <tr><th>&#160;</th><th>Name</th><th>Arguments</th><th>Actual</th><th>Expected</th></tr>\n`
        initialize(code)
        for (let j = 0; j < setup.sections[i].runs.length; j++) {
          const func = setup.sections[i].runs[j].caption // Get function name
          const input = setup.sections[i].runs[j].args[0].value
          try {
            pyodide.runPython(`print(${func}(${input}))`) // Run each testcase
            pf = check(setup.sections[i].runs[j].output, getOutput(), 1)
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
        report += `</table>
        </div>
        <p class="header studentFiles">Submitted files</p>
        <div class="studentFiles">
        <p class="caption">${name}:</p>
        <pre class="output">${code}
        </pre>
        </div>
        <p class="header score">Score</p>
        <div class="score">
        <p class="score">${correct}/${total}</p>
        </div>
        </div>`
        break
      case 'run':
        report += `<p class="header run">Running ${name}</p>
        <div class="run">`
        for (let j = 0; j < setup.sections[i].runs.length; j++) {
          const inputs = setup.sections[i].runs[j].input.split('\n')
          try {
            if (code.indexOf('input') !== -1) {
              const str = 'next(inputs)'
              newCode = `inputs = iter([${inputs}])\n${code.replace(/input\((.*?)\)/, str)}` // Switch user input to computer input
              const index = newCode.indexOf(')', newCode.indexOf(str) + str.length) + 1
              const prompt = (str, start, end) => str.substring(str.indexOf(start) + start.length, str.indexOf(end, str.indexOf(start) + start.length))
              newCode = newCode.slice(0, index) + `${newCode.slice(index).match(/^\s*/)[0]}print(f${prompt(code, 'input(', ')').slice(0, -1)}{n}")` + newCode.slice(index) // Print the input question and inputed value
              pyodide.runPython(newCode) // Run each testcase
            } else {
              initialize(code)
            }
            if (setup.useFiles !== undefined) {
              for (file of Object.values(setup.useFiles)) {
                newCode = file.replace(/from\s+\S+\s+import\s+\S+/g, '')
                pyodide.runPython(newCode)
              }
            }
            pf = check(setup.sections[i].runs[j].output, getOutput(), 1)
          } catch (err) {
            setText(err, OUTPUT)
          }
        }
        report += `<span class=${pf}>${pf}</span>
        </div>
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
        break
      case 'sub':
        report += `<p class="header sub">Running program with substitutions</p>
        <div class="sub">
        <table class="run">
        <tr><th>&#160;</th><th>Name</th>`
        for (arg of setup.sections[i].runs[0].args) {
          report += `<th>${arg.name}</th>`
        }
        report += '<th>Actual</th><th>Expected</th></tr>\n'
        for (let j = 0; j < setup.sections[i].runs.length; j++) {
          try {
            let newCode = code
            for (arg of setup.sections[i].runs[j].args) {
              newCode = newCode.replace(new RegExp(`\\${arg.name}\\ .*`), `${arg.name} = ${arg.value}`)
            }
            pyodide.runPython(newCode) // Run each testcase
            pf = check(setup.sections[i].runs[j].output, getOutput(), 1)
            report += `<tr><td><span class=${pf}>${pf}</span></td>
            <td><pre>${name.split('.')[0]}</pre></td>`
            for (arg of setup.sections[i].runs[j].args) {
              report += `<td><pre>${arg.value}</pre></td>`
            }
            report += `<td><pre>${output}
            </pre></td>
            <td><pre>${expectedOutput}
            </pre></td>
            </tr>\n`
          } catch (err) {
            setText(err, OUTPUT)
          }
        }
        report += `</table>
        </div>
        <p class="header studentFiles">Submitted files</p>
        <div class="studentFiles">
        <p class="caption">${name}:</p>
        <pre class="output">${code}
        </pre>
        </div>
        <p class="header score">Score</p>
        <div class="score">
        <p class="score">${correct}/${total}</p>
        </div>
        </div>`
        break
      case 'unitTest':
        report += `<p class="header unitTest">Unit Tests</p>
        <div class="run">`
        for (let j = 0; j < setup.sections[i].runs.length; j++) {
          try {
            initialize(code)
            if (setup.useFiles !== undefined) {
              const fileName = name.slice(0, -3)
              newCode = setup.useFiles[setup.sections[i].runs[j].caption]
                .replace(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g'), '')
                .replace(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm'), (match, p1, p2, p3) =>
                  p1.replace(new RegExp(`\\b${fileName}\\b`), '').replace(/,\s*$/, '')
                )
                .replace(new RegExp(`\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`, 'g'), '') + '\ntry:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())'
              pyodide.runPython(newCode)
            }
            pf = check('OK', OUTPUT.value.split('\n')[4], parseInt(OUTPUT.value.split('\n')[2].match(/\d+/)[0]))
          } catch (err) {
            setText(err, OUTPUT)
          }
        }
        report += `<span class=${pf}>${pf}</span>
        </div>
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
        break
      case 'tester': // TODO: Write this method
        break
    }
  }
  report += '</body></html>'
  return { report }
}
