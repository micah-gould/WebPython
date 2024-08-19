/* eslint no-unused-vars: off
    -------------
    no-unused-vars is off because the function updateInputs is written in this file but called from another
 */

let inputs
let filenames

window.addEventListener('load', () => {
  inputs = Array.from(document.getElementsByClassName('contents'))
  filenames = Array.from(document.getElementsByClassName('filename'))
  // Automatically update text area size
  document.addEventListener('keydown', () => {
    inputs.forEach(INPUT => {
      INPUT.style.height = 'auto'
      const fontSize = parseFloat(window.getComputedStyle(INPUT).fontSize)
      INPUT.style.height = `${INPUT.scrollHeight + fontSize}px`
    })
  })

  document.getElementById('submit').addEventListener('click', () => {
    updateInputs()
    console.log(inputs.length, filenames.length)
    const specialFilenames = []
    const specialInputs = []
    for (let i = 0; i < filenames.length; i++) {
      if (isSpecialFile(filenames[i].value)) {
        specialFilenames.push(filenames.splice(i, 1))
        specialInputs.push(inputs.splice(i, 1))
        i--
      }
    }
    const setup = {
      sections: [],
      useFiles: {
        '': ''
      },
      description: ''
    }
    for (let i = 0; i < filenames.length; i++) {
      const filename = filenames[i].value
      const type = getType(filename)
      setup.sections.push({
        requiredFiles: {
          [filename]: { editors: [''] }
        },
        type,
        runs: [
          {
            input: '',
            output: ''
          }
        ]
      })
    }
    console.log(setup)
  })
})

function isSpecialFile (file) {
  const specialSuffixes = ['in', 'html']
  if (specialSuffixes.includes(file.split('.')[1])) return true
  return false
}

function getType (file) {
  return 'test'
}

function format (str) {
  // const specials = ['HIDE', 'EDIT', 'SUB', 'CALL']
  return str
}

function updateInputs () {
  inputs = Array.from(document.getElementsByClassName('contents'))
  filenames = Array.from(document.getElementsByClassName('filename'))
}
