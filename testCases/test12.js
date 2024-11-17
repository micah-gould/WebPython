/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          mainclass: 'prog.py',
          args: [
            {
              name: 'Command line arguments',
              value: '-1 4 10'
            }
          ],
          output: '1\n16\n100\n'
        },
        {
          mainclass: 'prog.py',
          args: [
            {
              name: 'Command line arguments',
              value: '1 2 3'
            }
          ],
          output: '1\n4\n9\n'
        }
      ]
    }
  ],
  requiredFiles: {
    'prog.py': {
      editors: [null, '# TODO: Print the squares of all command line arguments\n', 'import sys\nfor arg in sys.argv[1:]:\n  number = int(arg)\n  print(number**2)'
      ]
    }
  }
})
