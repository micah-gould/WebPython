/* eslint no-unused-vars: off
    -------------
    no-unused-vars is off because the function updateInputs is written in this file but called from another
 */

let INPUTS
let NAMES

window.addEventListener('load', () => {
  INPUTS = Array.from(document.getElementsByClassName('contents'))
  NAMES = Array.from(document.getElementsByClassName('filename'))
  // Automatically update text area size
  document.addEventListener('keydown', () => {
    INPUTS.forEach(INPUT => {
      INPUT.style.height = 'auto'
      const fontSize = parseFloat(window.getComputedStyle(INPUT).fontSize)
      INPUT.style.height = `${INPUT.scrollHeight + fontSize}px`
    })
  })

  document.getElementById('submit').addEventListener('click', () => { INPUTS.forEach(INPUT => { console.log(format(INPUT.value)) }) })
})

function format (str) {
  // const specials = ['HIDE', 'EDIT', 'SUB', 'CALL']
  return str
}

function updateInputs () {
  INPUTS = Array.from(document.getElementsByClassName('contents'))
  NAMES = Array.from(document.getElementsByClassName('filename'))
}
