/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'sub',
      runs: [
        {
          mainclass: 'numbers.py',
          args: [
            { name: 'x', value: '3' },
            { name: 'y', value: '4' }
          ],
          output: '3.5'
        },
        {
          mainclass: 'numbers.py',
          args: [
            { name: 'x', value: '5' },
            { name: 'y', value: '6' }
          ],
          output: '5.5'
        },
        {
          mainclass: 'numbers.py',
          args: [
            { name: 'x', value: '8' },
            { name: 'y', value: '4' }
          ],
          output: '6.0'
        },
        {
          mainclass: 'numbers.py',
          args: [
            { name: 'x', value: '12' },
            { name: 'y', value: '4' }
          ],
          output: '8.0',
          hidden: true
        }
      ]
    }
  ],
  requiredFiles: {
    'numbers.py': {
      editors: ['x = 3\ny = 4\naverage = 0.5*(x+y)\nprint(average)\n']
    }
  },
  description:
        '<p>Complete this program so that it prints the average of <code>x</code> and <code>y</code>.</p>\n'
})
