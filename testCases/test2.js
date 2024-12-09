/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'tester',
      runs: [
        {
          mainclass: 'numbers.py',
          caption: 'numbersTester.py',
          output: '9\nExpected: 9\n9\nExpected: 9\n0\nExpected: 0\n'
        },
        {
          mainclass: 'numbers.py',
          caption: 'numbersTester.py',
          output: '9\nExpected: 9\n9\nExpected: 9\n0\nExpected: 0\n',
          hidden: true
        }
      ]
    }
  ],
  requiredFiles: {
    'numbers.py': { editors: ['def square(n):\n  return n*n'] }
  },
  useFiles: {
    'numbersTester.py':
          'from numbers import square\n\nprint(square(3))\nprint("Expected: 9");\nprint(square(-3))\nprint("Expected: 9");\nprint(square(0))\nprint("Expected: 0");\n'
  }
})
