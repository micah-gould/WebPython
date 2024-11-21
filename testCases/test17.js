/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          caption: 'Test 1',
          mainclass: 'total3.py',
          input: 'input.txt\nreport.txt',
          output: 'Input file name: 〈input.txt〉\nOutput file name: 〈report.txt〉\n',
          files: {
            'report.txt': '          32.00          54.00\n          67.50          29.00\n          35.00          80.25\n         115.00          44.50\n         100.00          65.00\n       -----------------------\n               Total:   622.25\n               Average:  62.23\n'
          }
        }
      ]
    }
  ],
  requiredFiles: {
    'total3.py': {
      editors: [`
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
   outfile.write("%15.2f" % value)
   total = total + value
   count = count + 1
   if count % 2 == 0 :
      outfile.write("\\n")
   line = infile.readline()

# Output the total and average.
outfile.write("%30s\\n" % "-----------------------")
outfile.write("               Total: %8.2f\\n" % total)

avg = total / count
outfile.write("               Average: %6.2f\\n" % avg)

# Close the files.
infile.close()
outfile.close()`]
    }
  },
  useFiles: {
    'input.txt': '32.00\n54.00\n67.50\n29.00\n35.00\n80.25  \n115.00\n44.50\n100.00\n65.00\n',
    'out.txt': '          32.00          54.00\n          67.50          29.00\n          35.00          80.25\n         115.00          44.50\n         100.00          65.00\n       -----------------------\n               Total:   622.25\n               Average:  62.23\n'
  },
  description: '\u003Cdiv\u003E\u003Cp\u003EModify the \u003Ccode\u003Etotal.py\u003C/code\u003E program so that it writes the values in two \ncolumns, like this:\u003C/p\u003E\n\u003Cpre\u003E\n          32.00          54.00\n          67.50          29.00\n          35.00          80.25\n         115.00          44.50\n         100.00          65.00\n       -----------------------\n               Total:   622.25\n               Average:  62.23\n\u003C/pre\u003E\n\u003C/div\u003E\n'
})
