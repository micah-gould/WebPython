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

    if (e.key === 'Enter') {
      e.preventDefault() // Prevent the default behavior
      const cursorPosition = INPUT.selectionStart
      const valueBeforeCursor = INPUT.value.slice(0, cursorPosition)
      const currentLineStart = valueBeforeCursor.lastIndexOf('\n') + 1 // Find the start of the current line
      const currentLine = valueBeforeCursor.slice(currentLineStart)
      const leadingSpaces = currentLine.match(/^\s*/)[0].length // Count the leading white spaces

      // Insert a newline with the same amount of leading white spaces
      const newLine = '\n' + ' '.repeat(leadingSpaces)
      INPUT.value = valueBeforeCursor + newLine + INPUT.value.slice(cursorPosition)
      INPUT.setSelectionRange(cursorPosition + newLine.length, cursorPosition + newLine.length)
    }
  }
})
