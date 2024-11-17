/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          mainclass: 'linenums.py',
          input: '',
          output: '',
          files:
              {
                'output.txt': '  1: Mary had a little lamb,\n  2: little lamb, little lamb,\n  3: Mary had a little lamb,\n  4: whose fleece was white as snow.\n  5: \n  6: And everywhere that Mary went,\n  7: Mary went, Mary went,\n  8: and everywhere that Mary went,\n  9: the lamb was sure to go.\n'
              }
        }
      ]
    }
  ],
  requiredFiles: {
    'linenums.py': {
      editors: [
        'infile = open("input.txt", "r")\noutfile = open("output.txt", "w")\n\nfor line_number, line in enumerate(infile, start=1):\n  outfile.write(f"  {line_number}: {line}")\n\ninfile.close()\noutfile.close()\n'
      ]
    }
  },
  useFiles: {
    'input.txt':
          'Mary had a little lamb,\nlittle lamb, little lamb,\nMary had a little lamb,\nwhose fleece was white as snow.\n\nAnd everywhere that Mary went,\nMary went, Mary went,\nand everywhere that Mary went,\nthe lamb was sure to go.\n'
  },
  description:
        '<p>Complete this program so that it prints all lines from input.txt to output.txt, preceded by line numbers. For example,</p>\n<pre>  1: In Xanadu did Kubla Khan\n  2: A stately pleasure-dome decree :\n  3: Where Alph, the sacred river, ran\n  4: Through caverns measureless to man\n  5: Down to a sunless sea. </pre>\n'
})
