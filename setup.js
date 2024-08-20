let contents
let filenames

window.addEventListener('load', () => {
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
        inputs = code
        break
      case 'html':
        setup.description = code
        break
      case 'run':
        section.runs.push({ inputs })
        setup.sections.push(section)
        break
      case 'call':
        section.runs.push({})
        setup.sections.push(section)
        break
      case 'sub':
        section.runs.push({})
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
  if (code.includes('##CALL')) return 'call'
  if (code.includes('##SUB')) return 'sub'

  return 'test'
}

function newSection (filename, code, type) {
  return {
    requiredFiles: { [filename]: { editors: format(code) } },
    type,
    runs: []
  }
}

function format (str) {
  const specials = ['##CALL', '##IN']
  const lines = str.split('\n')
  let hidden = false
  const newLines = lines.filter(line => !specials.some(v => line.includes(v))).map(line => {
    if (line.includes('##HIDE')) hidden = true
    if (line.includes('##EDIT')) hidden = false
    if (hidden === true) return ''
    const subIndex = line.indexOf('##SUB')
    return subIndex !== -1 ? line.slice(0, subIndex) : line
  }).filter(line => line !== '')

  const editLines = newLines.filter(line => line.includes('##EDIT')).map(line => {
    newLines[newLines.indexOf(line)] = 'ESCAPE'
    const subIndex = line.indexOf('##EDIT')
    return subIndex !== -1 ? line.slice(0, subIndex) + line.slice(subIndex + '##EDIT'.length) : line
  })
  console.log(newLines, editLines)

  const output = newLines.join('\n').split('ESCAPE').map(line => line === '\n' ? '' : line).reduce((acc, item, index) => {
    if (item === '') {
      if ((acc[acc.length - 1] === '') || index === 0) {
        acc.push(null)
      }
      acc.push('')
    } else {
      acc.push(item)
    }
    return acc
  }, []).map(line => line === '' ? editLines.shift() : line)
  return output
}
