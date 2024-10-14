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
const TILE = '##TILE'
const FIXED = '##FIXED'
const OR = '##OR'
const REQUIRED = '##REQUIRED'
const FORBIDDEN = '##FORBIDDEN'

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
    description: '',
    tolorence: 0.000001,
    ignorespace: false,
    ignorecase: false,
    timeout: 30000
  }
  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i].value
    let code = contents[i].value
    const type = getType(filename, code)
    const section = newSection(filename, code, type)
    let inputs = '';
    [setup.required, setup.forbiden, code] = getRequiredForbidden(code)

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
      case 'unitTest':
      case 'tester':
        section.runs.push({ caption: filenames[i + 1].value, output: getOutput(`${code}\n${contents[i + 1].value}`, inputs) })
        setup.sections.push(section)
        break
      case 'parsons':
        section.requiredFiles[filename] = getParsons(code)
        section.runs.push({ output: getOutput(code) })
        setup.sections.push(section)
        break
      default:
        setup.useFiles[filename] = code
    }
  }
  console.log(JSON.stringify(setup, undefined, 2))
}

function updateInputs () {
  contents = Array.from(document.getElementsByClassName('contents'))
  filenames = Array.from(document.getElementsByClassName('filename'))
}

function getType (filename, code) {
  const files = filenames.map(file => file.value)
  if ((/test/i).test(files[files.indexOf(filename) + 1])) {
    if (contents[files.indexOf(filename) + 1].value.includes('unittest')) return 'unitTest'
    return 'tester'
  }
  if (filename.split('.')[1] === 'in') return 'input'
  if (filename.split('.')[1] === 'html') return 'html'
  if (code.includes(TILE)) return 'parsons'
  if (code.includes(CALL)) return 'call'
  if (code.includes(SUB)) return 'sub'
  if (code.includes(EDIT)) return 'run'
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

  // Remove any importing of the user's file because it's functions were initialized
  filenames.map(name => name.value.split('.')[0]).filter(name => !(/test/i).test(name)).forEach(fileName => {
    newCode = newCode
      .replace(new RegExp(`from\\s+${fileName}\\s+import\\s+\\S+`, 'g'), '')
      .replace(new RegExp(`^(import\\s+.*?)\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(\\s*,)?`, 'gm'), (match, p1, p2, p3) =>
        p1.replace(new RegExp(`\\b${fileName}\\b`), '').replace(/,\s*$/, '')
      )
      .replace(new RegExp(`\\b${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`, 'g'), '')
  })
  newCode += code.includes('unittest') ? '\ntry:\n  unittest.main()\nexcept SystemExit as e:\n  print(sys.stdout.getvalue())' : ''
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

function getParsons (code) {
  const results = { fixed: [''], tiles: [] }
  const lines = code.split('\n')
  let tileing = false
  let skip = 0

  lines.forEach(line => {
    if (skip > 0) {
      skip--
      results.tiles[results.tiles.length - 1] += (line + '\n')
      if (skip === 0) {
        const length = results.tiles[results.tiles.length - 1].search(/\S/)
        results.tiles[results.tiles.length - 1] = results.tiles[results.tiles.length - 1]
          .split('\n')
          .map(l => l.slice(length))
          .join('\n')
          .trim()
      }
      return
    }
    if (line.includes(TILE)) {
      tileing = true
      count = line.slice(TILE.length)
      if (count > 0) {
        skip = count
        results.tiles.push('')
      }
      return
    }
    if (line.includes(FIXED)) {
      results.fixed.push('')
      tileing = false
      return
    }
    if (line.includes(OR)) {
      results.tiles.push(line.slice(line.indexOf(OR) + OR.length).trim())
      return
    }
    tileing ? results.tiles.push(line.trim()) : results.fixed[results.fixed.length - 1] += (line + '\n')
  })
  for (let i = results.tiles.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results.tiles[i], results.tiles[j]] = [results.tiles[j], results.tiles[i]]
  }
  console.log(results)
  return results
}

function getRequiredForbidden (code) {
  const output = [[], []]
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(REQUIRED)) {
      lines[i] = lines[i].replace(REQUIRED, '')
      output[0].push({ [lines[i].trim()]: lines[++i].replace('##', '').trim() })
      lines[i] = ''
    }
    if (lines[i].includes(FORBIDDEN)) {
      lines[i] = lines[i].replace(FORBIDDEN, '')
      output[1].push({ [lines[i].trim()]: lines[++i].replace('##', '').trim() })
      lines[i] = ''
    }
  }
  output[2] = lines.filter(line => line !== '').join('\n')
  return output
}
