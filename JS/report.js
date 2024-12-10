class ReportBuilder {
  constructor () {
    this.Tests = ReportBuilder.Tests
    this.report = `
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <style type="text/css">
    .header {
      font-weight: bold;
      font-size: 1.2em;
    }
    .item {
      font-weight: bold;
    }
    .pass {
      color: green;
    }
    .fail {
      color: red;
    }
    .note {
      color: blue;
      font-weight: bold;
    }
    table.file td {
      padding-right: 1em;
      background: #FFF;
    }
    .linenumber {
      color: gray;
    }
    .footnote {
      font-size: 0.7em;
    }
    table {
      font-size: 0.9em;
    }
    td, th {
      background: #EEE;
      margin: 0.5em;
      padding: 0.25em;
    }
    table.output td {
      vertical-align: top;
    }
    div.footnotes {
      border-top: 1px solid gray;
      padding-top: 0.5em;
    }
  </style>
  <title>Report</title>
</head>
<body>`
  }

  appendOnce (text) {
    if (!this.report.includes(text)) this.report += text
  }

  newCall () {
    this.appendOnce(`
  <p class="header call">Calling with Arguments</p>
  <div class="call">
    <table class="run">
      <tr>
        <th>&#160;</th>
        <th>Name</th>
        <th>Arguments</th>
        <th>Actual</th>
        <th id='expected-header'>Expected</th>
        <th id='diff-header'>Difference</th>
      </tr>`)
  }

  newRun (name) {
    this.appendOnce(`
  <p class="header run">Running ${name}</p>
  <div class="run">
    <table class="run">
      <tr>
        <th>&#160;</th>
        <th>Actual</th>
        <th id='expected-header'>Expected</th>
        <th id='diff-header'>Difference</th>
      </tr>`)
  }

  newSub (args) {
    this.appendOnce(`
  <p class="header sub">Running program with substitutions</p>
  <div class="sub">
    <table class="run">
      <tr>
        <th>&#160;</th>
        <th>Name</th>
        ${args.map(arg => `<th>${arg.name}</th>`).join('\n')}
        <th>Actual</th>
        <th id='expected-header'>Expected</th>
        <th id='diff-header'>Difference</th>
      </tr>`)
  }

  newUnitTest () {
    this.appendOnce(`
  <p class="header unitTest">Unit Tests</p>
  <div class="run">`)
  }

  newTester () {
    this.appendOnce(`
  <p class="header tester">Testers</p>
  <div class="run">`)
  }

  newTests () {
    return new this.Tests(this)
  }

  newRow () {
    this.report += `
      <tr>
        <td>`
  }

  pf (pf) {
    this.report += `<span class=${pf}>${pf}</span> `
  }

  info (hidden = false, info) {
    this.report += `</td>
        <td><pre>${hidden ? 'HIDDEN' : info}</pre>`
  }

  closeRow (hidden = false, pass, output, expectedOutput, diff) {
    const format = output =>
      output instanceof Uint8Array
        ? `<img src="${URL.createObjectURL(new Blob([output]))}">`
        : output

    this.report += `</td>
        <td><pre>${hidden ? 'HIDDEN' : format(output)}</pre>`
    if (!pass) {
      this.report += `</td>
        <td class='expected'><pre>${hidden ? 'HIDDEN' : format(expectedOutput)}</pre></td>
        ${diff ? `        <td class='diff'><pre>${hidden ? 'HIDDEN' : format(diff)}</pre></td>` : ''}`
    }
    this.report += `
      </tr>`
  }

  closeTable () {
    this.report += `
    </table>`
  }

  studentFiles (file) {
    const names = Object.keys(file)
    names.forEach(name => {
      const code = file[name]
      this.report += `
  </div>
  <p class="header studentFiles">Submitted files</p>
  <div class="studentFiles">
    <p class="caption">${name}:</p>
    <pre class="output">${code}</pre>
  </div>`
    })
  }

  providedFiles (files) {
    this.report += `
  <p class="header providedFiles">Provided files</p>
  <div class="providedFiles">
    ${files
      ? Object.entries(files)
      .map(([key, file]) => `
<p class="caption">${key}:</p>
<pre class="output">${file}</pre>`)
      .join('')
      : ''}
  </div>`
  }

  score (correct, total) {
    this.report += `
  <p class="header score">Score</p>
  <div class="score">
    <p class="score">${correct}/${total}</p>
  </div>`
  }

  end () {
    this.report += `
</body>
</html>`
  }
}

ReportBuilder.Tests = class {
  constructor (report) {
    this.tests = '<pre class=\'output\'>'
    this.report = report
  }

  addTest (hidden = false, output, expectedOutput, pf) {
    this.tests += `<span class=${hidden ? '' : pf}>${hidden ? 'HIDDEN' : output}</span>\nExpected: ${hidden ? 'HIDDEN' : expectedOutput}\n`
  }

  append () {
    this.report.report += (this.tests + '</pre>')
  }
}
