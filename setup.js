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
  const newLines = lines.filter(line => !specials.some(v => line.includes(v)))
  return [newLines.join('\n')]
}
