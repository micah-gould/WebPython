window.addEventListener('load', () => {
  const INPUT = document.getElementById('input')
  INPUT.onkeydown = (e) => {
    const pairs = {
      '"': '""',
      '`': '``',
      "'": "''",
      '(': '()',
      '[': '[]',
      '{': '{}'
    }
    const special = {
      ':': ':\n  '
    }

    if (e.key in pairs || e.key in special) {
      e.preventDefault() // Prevent the default behavior
      const cursorPosition = INPUT.selectionStart // Get the current cursor position
      INPUT.value = INPUT.value.slice(0, cursorPosition) + { ...pairs, ...special }[e.key] + INPUT.value.slice(cursorPosition)
      if (e.key in pairs) INPUT.setSelectionRange(cursorPosition + 1, cursorPosition + 1) // Move the cursor inside the brackets
    }
  }
})
