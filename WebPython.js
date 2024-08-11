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
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/',
    stdout: (msg) => { addText(`\nPyodide: ${msg}`, OUTPUT) }
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

async function python (params, inputs, outputs) {
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
<body>
<p class="header call">Calling with Arguments</p>
<div class="call">
<table class="run">
<tr><th>&#160;</th><th>Name</th><th>Arguments</th><th>Actual</th><th>Expected</th></tr>\n
`
  OUTPUT.value = '' // Clear output
  const name = Object.keys(params).filter(a => a.split('.')[1] === 'py')[0]
  const code = params[name] // Get python code
  try {
    pyodide.runPython('print("")')
    pyodide.runPython(code) // Run python
    // This code fixes an issue if the user leaves in any print statemnts in the code
    const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
    stdoutOLD = stdoutOLD.concat(stdout.split('\n')) // Add the new outputs to the list of old outputs
  } catch (err) {
    setText(err, OUTPUT)
  }

  const func = code.split('\n').filter(a => a.slice(0, 3) === 'def')[0].split(' ')[1].split('(')[0] // Get first function name
  const total = inputs.length
  let correct = 0

  try {
    for (let i = 0; i < total; i++) {
      pyodide.runPython(`print(${func}(${inputs[i].join(', ')}))`) // Run each testcase
      const stdout = pyodide.runPython('sys.stdout.getvalue()').split('\n').slice(stdoutOLD.length, -1).join('\n') // Get the new outputs
      stdoutOLD = stdoutOLD.concat(stdout.split('\n')) // Add the new outputs to the list of old outputs
      addText(stdout + '\n', OUTPUT)
      let score
      const input = inputs[i]
      const expectedOutput = outputs[i]
      const output = stdout
      if (expectedOutput === output) { // Check if output was correct
        correct++
        score = 'pass'
      } else {
        score = 'fail'
      }
      report += `<tr><td><span class="pass">${score} </span></td>
<td><pre>${name}</pre></td>
<td><pre>${input}</pre></td>
<td><pre>${output}
</pre></td>
<td><pre>${expectedOutput}
</pre></td>
</tr>\n`
    }
  } catch (err) {
    setText(err, OUTPUT)
  }

  report += `</table>
</div>
<p class="header studentFiles">Submitted files</p>
<div class="studentFiles">
<p class="caption">${name}:</p>
<pre class="output">${params[name]}
</pre>
</div>
<p class="header score">Score</p>
<div class="score">
<p class="score">${correct}/${total}</p>
</div>
<div class="footnotes"><div class="footnote">2024-08-11T15:28:43Z</div>
</div>
</body></html>`
  return { report }
}
