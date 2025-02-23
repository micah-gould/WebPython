/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'call',
      runs: [
        {
          mainclass: 'numbers.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '3, 4' }],
          output: '3.5'
        },
        {
          mainclass: 'numbers.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '-3, 3' }],
          output: '0.0'
        },
        {
          mainclass: 'numbers.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '3, 0' }],
          output: '1.5'
        },
        {
          mainclass: 'numbers.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '10, 2' }],
          output: '6.0',
          hidden: true
        }
      ]
    }
  ],
  requiredFiles: {
    'numbers.py': {
      editors: [null, 'def average(x, y) :\n', '    return 0.5*(x+y)\n']
    }
  },
  description:
        '<p>Write a function <code>average</code> that returns the average of two numbers.</p>\n'
})
