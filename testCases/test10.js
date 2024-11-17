/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        { mainclass: 'numbers.py', input: '', output: '0\n1\n4\n9\n16\n25\n36\n49\n64\n81' }
      ]
    }
  ],
  requiredFiles: {
    'numbers.py': {
      editors: [
        null,
        'def square(n) :\n',
        '    return n*n\n',
        '\nfor i in range(0, 10) :\n   print(square(i))\n'
      ]
    }
  }
})
