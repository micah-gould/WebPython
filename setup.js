window.addEventListener('load', () => {
  const INPUT = document.getElementById('input')

  // Automatically update text area size
  document.addEventListener('keydown', () => {
    INPUT.style.height = 'auto'
    const fontSize = parseFloat(window.getComputedStyle(INPUT).fontSize)
    INPUT.style.height = `${INPUT.scrollHeight + fontSize}px`
  })

  document.getElementById('submit').addEventListener('click', () => { console.log(format(INPUT.value)) })
})

function format (str) {
  return str
}
