/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          mainclass: 'numbers.py',
          input: '3\n-3\n0\n',
          output:
                  'Enter a number, 0 to quit: 〈3〉\n9\nEnter a number, 0 to quit: 〈-3〉\n9\nEnter a number, 0 to quit: 〈0〉'
        },
        {
          mainclass: 'numbers.py',
          input: '4\n-4\n0\n',
          output:
                  'Enter a number, 0 to quit: 〈4〉\n16\nEnter a number, 0 to quit: 〈-4〉\n16\nEnter a number, 0 to quit: 〈0〉',
          hidden: true
        }
      ]
    },
    {
      type: 'tester',
      runs: [
        {
          mainclass: 'number2s.py',
          caption: 'numbersTester.py',
          output: '9\nExpected: 9\n9\nExpected: 9\n0\nExpected: 0\n'
        },
        {
          mainclass: 'numbers2.py',
          caption: 'numbersTester.py',
          output: '9\nExpected: 9\n9\nExpected: 9\n0\nExpected: 0\n',
          hidden: true
        }
      ]
    }
  ],
  requiredFiles: {
    'numbers.py': {
      editors: [
        'while True :\n  n = int(input("Enter a number, 0 to quit: "))\n  if n == 0:\n    break\n  print(n*n)'
      ]
    },
    'numbers2.py': { editors: ['def square(n):\n  return n*n'] }
  },
  useFiles: {
    'numbersTester.py':
          'from numbers2 import square\n\nprint(square(3))\nprint("Expected: 9");\nprint(square(-3))\nprint("Expected: 9");\nprint(square(0))\nprint("Expected: 0");\n'
  },
  description:
          '<p>Write a program that reads integers and prints their squares. Stop at\nthe sentinel 0.</p>\n',
  attributes: {
    tolorence: 1
  }
})
