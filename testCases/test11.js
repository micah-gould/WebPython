/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [{ mainclass: 'Rainfall.py', output: '3.0\n0' }]
    }
  ],
  requiredFiles: { 'Rainfall.py': { fixed: ['def averageRainfall(rainfall):', 'print(averageRainfall([1, 2, -3, -4, -5, 6, 9999]))\nprint(averageRainfall([-1, -2, -3, 9999, 100]))', ''], tiles: ['return 0', 'count += 1', 'if (rainfall[i] >= 0):', 'if (count == 0):', 'else:\n  return sum / count', 'sum += rainfall[i]', 'i = 0', 'count = 0', 'sum = 0', 'while (rainfall[i] != 9999):', 'i += 1'] } },
  useFiles: {},
  description: ''
})
