/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          caption: 'Test 1',
          mainclass: 'total2.py',
          input: 'input.txt\nreport.txt',
          output: 'Input file name: 〈input.txt〉\nOutput file name: 〈report.txt〉\n',
          files: {
            'report.txt': '          32.00\n          54.00\n          67.50\n          29.00\n          35.00\n          80.25\n         115.00\n       --------\nTotal:   412.75\nAverage:  58.96\nMax:     115.00\nMin:      29.00\n'
          }
        }
      ]
    }
  ],
  requiredFiles: {
    'total2.py': {
      editors: [`
##SOLUTION
##IN input.txt
##OUT report.txt
##
#  This program reads a file containing numbers and writes the numbers to 
#  another file, lined up in a column and followed by their total and average.
#

# Prompt the user for the name of the input and output files.
inputFileName = input("Input file name: ")
outputFileName = input("Output file name: ")

# Open the input and output files.
infile = open(inputFileName, "r")
outfile = open(outputFileName, "w")

# Read the input and write the output.
total = 0.0
count = 0

##HIDE
minValue = 0
maxValue = 0
##SHOW
line = infile.readline()
while line != "" :
   value = float(line)
   ##HIDE
   if count == 0 :
      minValue = value
      maxValue = value
   else :
      if value < minValue :
         minValue = value
      if value > maxValue :
         maxValue = value
   ##SHOW
   outfile.write("%15.2f\\n" % value)
   total = total + value
   count = count + 1
   line = infile.readline()

# Output the total and average.
outfile.write("%15s\\n" % "--------")
outfile.write("Total: %8.2f\\n" % total)

avg = total / count
outfile.write("Average: %6.2f\\n" % avg)
##HIDE
outfile.write("Max:   %8.2f\\n" % maxValue)
outfile.write("Min:   %8.2f\\n" % minValue)
##SHOW

# Close the files.
infile.close()
outfile.close()
`
      ]
    }
  },
  useFiles: {
    'input.txt': '32.0\n54.0\n67.5\n29.0\n35.0\n80.25\n115.0\n'
  },
  description: '\u003Cdiv\u003E\u003Cp\u003E\nModify the \u003Ccode\u003Etotal.py\u003C/code\u003E program so that it also prints the largest and \nsmallest values, not just the total and average. For example, the output for \nthe sample input in Section 7.1.4 would look as follows:\n\u003C/p\u003E\n\u003Cpre\u003E          32.00\n          54.00\n          67.50\n          29.00\n          35.00\n          80.25\n         115.00\n       --------\nTotal:   412.75\nAverage:  58.96\nMax:     115.00\nMin:      29.00\n\n\u003C/pre\u003E\n\u003C/div\u003E\n'
})
