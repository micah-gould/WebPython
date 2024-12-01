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
    }
  ],
  requiredFiles: {
    'numbers.py': {
      editors: [
        'while True :\n  n = int(input("Enter a number, 0 to quit: "))\n  if n == 0:\n    break\n  print(n*n)'
      ]
    }
  },
  description:
        '<p>Write a program that reads integers and prints their squares. Stop at\nthe sentinel 0.</p>\n',
  attributes: {
    tolorence: 1
  }
})
