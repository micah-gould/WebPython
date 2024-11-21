/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          mainclass: 'total.py',
          input: 'input.txt\nout.txt\n',
          output: 'Input file name: 〈input.txt〉\nOutput file name: 〈out.txt〉\n',
          files: {
            'out.txt': '          32.00\n          54.00\n          67.50\n          29.00\n          35.00\n          80.25\n         115.00\n       --------\nTotal:   412.75\nAverage:  58.96\n'
          }
        }
      ]
    }
  ],
  requiredFiles: {
    'total.py': {
      editors: [`
##OUT out.txt 
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

line = infile.readline()
while line != "" :
   value = float(line)
   outfile.write("%15.2f\\n" % value)
   total = total + value
   count = count + 1
   line = infile.readline()

# Output the total and average.
outfile.write("%15s\\n" % "--------")
outfile.write("Total: %8.2f\\n" % total)

avg = total / count
outfile.write("Average: %6.2f\\n" % avg)

# Close the files.
infile.close()
outfile.close()
`]
    }
  },
  useFiles: {
    'input.txt': '32.0\n54.0\n67.5\n29.0\n35.0\n80.25\n115.0\n'
  }
})
