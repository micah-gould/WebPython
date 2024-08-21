/* eslint no-undef: off
    -------------
    no-undef is off because loadPyodide doesn't need to be declared locally */

let contents, filenames, pyodide
let stdoutOLD = [] // Array to store all past outputs (by line)
const SUB = '##SUB'
const CALL = '##CALL'
const IN = '##IN'
const HIDE = '##HIDE'
const EDIT = '##EDIT'

window.addEventListener('load', async () => {
  console.log('Loading pyodide')
  // Load Pyodide
  pyodide = await loadPyodide()
  console.log('Pyodide loaded')
  // Capture the Pyodide output
  try {
    pyodide.runPython('import sys\nimport io\nsys.stdout = io.StringIO()')
  } catch (err) {
    console.log(err)
  }
  contents = Array.from(document.getElementsByClassName('contents'))
  filenames = Array.from(document.getElementsByClassName('filename'))
  // Automatically update text area size
  document.addEventListener('keydown', () => {
    contents.forEach(INPUT => {
      INPUT.style.height = 'auto'
      const fontSize = parseFloat(window.getComputedStyle(INPUT).fontSize)
      INPUT.style.height = `${INPUT.scrollHeight + fontSize}px`
    })
  })

  document.getElementById('submit').addEventListener('click', submit)
})

function submit () {
  updateInputs()

  const setup = {
    sections: [],
    useFiles: {},
    description: ''
  }
  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i].value
    const code = contents[i].value
    const type = getType(filename, code)
    const section = newSection(filename, code, type)
    let inputs = ''

    switch (type) {
      case 'input':
        inputs += code
        break
      case 'html':
        setup.description = code
        break
      case 'run':
        inputs += getInputs(code)
        section.runs.push({ input: inputs, output: getOutput(code, inputs) })
        setup.sections.push(section)
        break
      case 'call':
        section.runs = getCalls(code)
        setup.sections.push(section)
        break
      case 'sub':
        section.runs = getSubs(code)
        setup.sections.push(section)
        break
      case 'tester':
        section.runs.push({})
        setup.sections.push(section)
        break
      case 'unitTest':
        section.runs.push({})
        setup.sections.push(section)
        break
      default:
        setup.useFiles[filename] = code
    }
  }
  console.log(setup)
}

function updateInputs () {
  contents = Array.from(document.getElementsByClassName('contents'))
  filenames = Array.from(document.getElementsByClassName('filename'))
}

function getType (filename, code) {
  if (filename.split('.')[1] === 'in') return 'input'
  if (filename.split('.')[1] === 'html') return 'html'
  if (code.includes(CALL)) return 'call'
  if (code.includes(SUB)) return 'sub'

  return 'run'
}

function newSection (filename, code, type) {
  return {
    requiredFiles: { [filename]: { editors: format(code) } },
    type,
    runs: []
  }
}

function format (code) {
  const specials = [CALL, IN]
  const lines = code.split('\n')
  let hidden = false
  const newLines = lines
    .filter(line => !specials.some(v => line.includes(v)))
    .map(line => {
      if (line.includes(HIDE)) hidden = true
      if (line.includes(EDIT)) hidden = false
      if (hidden === true) return ''
      const subIndex = line.indexOf(SUB)
      return subIndex !== -1 ? line.slice(0, subIndex) : line
    })
    .filter(line => line !== '')

  const editLines = newLines
    .filter(line => line.includes(EDIT))
    .map(line => {
      newLines[newLines.indexOf(line)] = 'ESCAPE'
      const subIndex = line.indexOf(EDIT)
      return subIndex !== -1 ? line.slice(0, subIndex) + line.slice(subIndex + EDIT.length) : line
    })

  const output = newLines
    .join('\n')
    .split('ESCAPE')
    .reduce((acc, item, index) => {
      if (item !== '' && index === 0) return editLines[index] !== undefined ? [null, item.trim(), editLines[index]] : [null, item.trim()]
      if (item === '\n') return editLines[index] !== undefined ? [...acc, null, editLines[index]] : [...acc]
      if (item === '') return editLines[index] !== undefined ? [...acc, editLines[index]] : [...acc]
      return editLines[index] !== undefined ? [...acc, item.trim(), editLines[index]] : [...acc, item.trim()]
    }, [])
  return output
}

function getInputs (code) {
  const inputs = code
    ?.match(new RegExp(IN + '(.*)', 'g'))
    ?.map(str => str.slice(IN.length)
      ?.replace(/\\n/g, '\n')
      ?.trim())
  return inputs || ''
}

function getOutput (code, inputs, func) {
  const newStr = 'next(inputs)'
  let newCode = `inputs = iter([${inputs?.split('\n') || 0}])\n${code}`
  code.match(/input\((.*?)\)/g)?.forEach(str => {
    const index = newCode.indexOf('\n', newCode.indexOf(str) + str.length)
    const variable = newCode.match(/(\b\w+\b)\s*=\s*.*?\binput\(/)[1]
    newCode = newCode.slice(0, index) + `${newCode.slice(index).match(/^\s*/)[0]}print(f"${str.slice(7, -2)}{${variable}}")` + newCode.slice(index) // Print the input question and inputed value
    newCode = newCode.replace(/input\((.*?)\)/, newStr) // Switch user input to computer input
  })
  pyodide.runPython(newCode)
  if (func) {
    pyodide.runPython(`print(${func}(${inputs}))`)
  }
  const output = pyodide.runPython('sys.stdout.getvalue()')
    .split('\n')
    .slice(stdoutOLD.length, -1)
    .join('\n') // Get the new outputs
  stdoutOLD = stdoutOLD.concat(output.split('\n')) // Add the new outputs to the list of old outputs

  return output
}

function getCalls (code) {
  const calls = code
    .match(new RegExp(CALL + '(.*)', 'g'))
    .map(call => call.slice(CALL.length)
      .trim())
    .map(call => {
      const func = code.match(/def\s+(\w+)\s*\((.*?)\)/)[1]
      return {
        caption: func,
        args: [{ name: 'Arguments', value: call }],
        output: getOutput(code, call, func)
      }
    })
  return calls
}

function getSubs (code) {
  const runs = []
  const calls = [...code.matchAll(new RegExp(`(\\w+)\\s*=\\s*\\w+\\s*${SUB}\\s*(.*)`, 'g'))].map(call => [call[1], call[2].split(', ')])

  calls.forEach(call => {
    for (let i = 0; i < call[1].length; i++) {
      if (runs.length < i + 1) runs.push({ args: [], output: '' })
      runs[i].args.push({ name: call[0], value: call[1][i] })
    }
  })

  const results = runs.map(run => {
    let newCode = code
    run.args.forEach(arg => {
      newCode = newCode.replace(new RegExp(`${arg.name}\\s*=\\s*\\w+`, 'g'), `${arg.name} = ${arg.value}`)
    })
    return { args: run.args, output: getOutput(newCode) }
  })

  return results
}
