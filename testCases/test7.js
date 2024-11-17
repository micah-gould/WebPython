/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'call',
      runs: [
        {
          mainclass: 'avg.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '3, 4' }],
          output: '3.5'
        },
        {
          mainclass: 'avg.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '-3, 3' }],
          output: '0.0'
        },
        {
          mainclass: 'avg.py',
          caption: 'average',
          args: [{ name: 'Arguments', value: '3, 0' }],
          output: '1.5'
        }
      ]
    }
  ],
  requiredFiles: {
    'avg.py': {
      editors: ['def average(x, y) :\n    return 0.5*(x+y)\n']
    }
  }
})
