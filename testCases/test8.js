/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'unitTest', // TODO: Make sure this is correct
      runs: [
        {
          mainclass: 'numbers.py',
          caption: 'NumbersTest.py',
          output:
                '..\n----------------------------------------------------------------------\nRan 2 tests in 0.000s\n\nOK'
        }
      ]
    }
  ],
  requiredFiles: {
    'numbers.py': { editors: ['def square(n):\n  return n*n'] }
  },
  useFiles: {
    'NumbersTest.py':
          'import unittest, numbers\n\nclass NumbersTest(unittest.TestCase):\n\n    def testNonNegativeSquares(self):\n        for n in range(100):\n            self.assertEqual(n * n, numbers.square(n))\n\n    def testNegativeSquares(self):\n        for n in range(1, 100):\n            self.assertEqual(n * n, numbers.square(-n))\n'
  }
})
