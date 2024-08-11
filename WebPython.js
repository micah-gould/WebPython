window.addEventListener('load', async () => {
  const OUTPUT = document.getElementById('output')
  OUTPUT.value = "HELLO I'M HERE"
  console.log(OUTPUT)
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

  const stdoutOLD = [] // Array to store all past outputs (by line)
})

async function python (params, inputs, output) {
  console.log(params)
  const name = Object.keys(params).filter(a => a.split('.')[1] === 'py')[0]
  console.log(name)
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

  report += `\n</table>
</div>
<p class="header studentFiles">Submitted files</p>
<div class="studentFiles">
<p class="caption">${name}:</p>
<pre class="output">${params[name]}
</pre>
</div>
<p class="header score">Score</p>
<div class="score">
<p class="score">5/5</p>
</div>
<div class="footnotes"><div class="footnote">2024-08-11T15:28:43Z</div>
</div>
</body></html>`
  console.log(report)
  return { report }
}
