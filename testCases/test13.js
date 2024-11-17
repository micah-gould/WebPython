/* eslint no-undef: off, camelcase: off */

horstmann_codecheck.setup.push({
  sections: [
    {
      type: 'run',
      runs: [
        {
          mainclass: 'search.py',
          args: [
            {
              name: 'Command line arguments',
              value: '-max 5 -k keywords.txt alice.txt'
            }
          ],
          output: "on the bank, and of having nothing to do:  once or twice she had\n\npictures or conversations in it, `and what is the use of a book,'\n\nthought Alice `without pictures or conversation?'\n\n  So she was considering in her own mind (as well as she could,\n\nfor the hot day made her feel very sleepy and stupid), whether\n\n"
        },
        {
          mainclass: 'search.py',
          args: [
            {
              name: 'Command line arguments',
              value: '-max 12 alice.txt'
            }
          ],
          output: 'Usage: python search.py [-max n] -k keywordfile file\n'
        },
        {
          mainclass: 'search.py',
          args: [
            {
              name: 'Command line arguments',
              value: '-k keywords.txt alice.txt'
            }
          ],
          output: "on the bank, and of having nothing to do:  once or twice she had\n\npictures or conversations in it, `and what is the use of a book,'\n\nthought Alice `without pictures or conversation?'\n\n  So she was considering in her own mind (as well as she could,\n\nfor the hot day made her feel very sleepy and stupid), whether\n\nof getting up and picking the daisies, when suddenly a White\n\nRabbit with pink eyes ran close by her.\n\n  There was nothing so VERY remarkable in that; nor did Alice\n\nPOCKET, and looked at it, and then hurried on, Alice started to\n\nher feet, for it flashed across her mind that she had never\n\nbefore seen a rabbit with either a waistcoat-pocket, or a watch to\n\ntake out of it, and burning with curiosity, she ran across the\n\nfield after it, and fortunately was just in time to see it pop\n\n  In another moment down went Alice after it, never once\n\nconsidering how in the world she was to get out again.\n\n  The rabbit-hole went straight on like a tunnel for some way,\n\nand then dipped suddenly down, so suddenly that Alice had not a\n\n  Either the well was very deep, or she fell very slowly, for she\n\nhad plenty of time as she went down to look about her and to\n\ndown and make out what she was coming to, but it was too dark to\n\nsee anything; then she looked at the sides of the well, and\n\nnoticed that they were filled with cupboards and book-shelves;\n\nhere and there she saw maps and pictures hung upon pegs.  She\n\ntook down a jar from one of the shelves as she passed; it was\n\nwas empty:  she did not like to drop the jar for fear of killing\n\nsomebody, so managed to put it into one of the cupboards as she\n\n  `Well!' thought Alice to herself, `after such a fall as this, I\n\neven if I fell off the top of the house!' (Which was very likely\n\n"
        }
      ]
    }
  ],
  requiredFiles: {
    'search.py': {
      editors: [null, 'from sys import argv, exit\n\ndef main() :\n   maxLines = -1\n   keywordFile = ""\n   inputFile = ""\n   \n',
        '   # TODO: Process command line arguments\n   if len(argv) < 3:\n      usage()  # Not enough arguments, show usage message\n\n   maxLines = -1  # Default is no limit on lines printed\n   keywordFile = ""\n   inputFile = ""\n\n   # Loop over arguments to find options and their values\n   i = 1  # Start after the script name in argv[0]\n   while i < len(argv):\n      if argv[i] == "-max":\n         if i + 1 < len(argv):\n            try:\n               maxLines = int(argv[i + 1])\n               i += 2\n            except ValueError:\n               usage()  # maxLines must be an integer\n         else:\n            usage()  # No value provided for -max\n      elif argv[i] == "-k":\n         if i + 1 < len(argv):\n            keywordFile = argv[i + 1]\n            i += 2\n         else:\n            usage()  # No value provided for -k\n      else:\n         # The last argument should be the input file\n         inputFile = argv[i]\n         i += 1\n\n   # Ensure required arguments are provided\n   if keywordFile == "" or inputFile == "":\n      usage()',
        '   \n   keywords = loadKeywords(keywordFile)\n   \n   count = 0\n   infile = open(inputFile)\n   \n   line = infile.readline()\n   while line != "" and (maxLines == -1 or count \u003C maxLines) :\n      if contains(line, keywords) :\n         print(line)\n         count = count + 1\n         \n      line = infile.readline()\n\n##\n# Loads a collection of key words from a text file and stores them into a list.\n# @param filename name of the text file\n# @return a list of words converted to all lowercase\n#\ndef loadKeywords(filename) :\n   keywords = []\n   infile = open(filename)\n   for line in infile :\n      line = line.strip()\n      keywords.append(line.lower())\n      \n   infile.close()\n   return keywords\n  \n##\n# Checks whether the line contains one or more of the given words.\n# @param line a string of text\n# @param keywords a list of keywords\n# @return True if line contains one or more of words\n#\ndef contains(line, keywords) :\n   parts = line.split()\n   for word in parts :\n      word = word.lower()     \n      for key in keywords :\n         if key == word :\n            return True\n            \n   return False\n\n##\n# Prints a message describing proper usage and exits.\n#\ndef usage() :\n   print("Usage: python search.py [-max n] -k keywordfile file");\n   exit()\n  \n\nmain()\n'
      ]
    }
  },
  useFiles: {
    'alice.txt': "  Alice was beginning to get very tired of sitting by her sister\r\non the bank, and of having nothing to do:  once or twice she had\r\npeeped into the book her sister was reading, but it had no\r\npictures or conversations in it, `and what is the use of a book,'\r\nthought Alice `without pictures or conversation?'\r\n\r\n  So she was considering in her own mind (as well as she could,\r\nfor the hot day made her feel very sleepy and stupid), whether\r\nthe pleasure of making a daisy-chain would be worth the trouble\r\nof getting up and picking the daisies, when suddenly a White\r\nRabbit with pink eyes ran close by her.\r\n\r\n  There was nothing so VERY remarkable in that; nor did Alice\r\nthink it so VERY much out of the way to hear the Rabbit say to\r\nitself, `Oh dear!  Oh dear!  I shall be late!'  (when she thought\r\nit over afterwards, it occurred to her that she ought to have\r\nwondered at this, but at the time it all seemed quite natural);\r\nbut when the Rabbit actually TOOK A WATCH OUT OF ITS WAISTCOAT-\r\nPOCKET, and looked at it, and then hurried on, Alice started to\r\nher feet, for it flashed across her mind that she had never\r\nbefore seen a rabbit with either a waistcoat-pocket, or a watch to\r\ntake out of it, and burning with curiosity, she ran across the\r\nfield after it, and fortunately was just in time to see it pop\r\ndown a large rabbit-hole under the hedge.\r\n\r\n  In another moment down went Alice after it, never once\r\nconsidering how in the world she was to get out again.\r\n\r\n  The rabbit-hole went straight on like a tunnel for some way,\r\nand then dipped suddenly down, so suddenly that Alice had not a\r\nmoment to think about stopping herself before she found herself\r\nfalling down a very deep well.\r\n\r\n  Either the well was very deep, or she fell very slowly, for she\r\nhad plenty of time as she went down to look about her and to\r\nwonder what was going to happen next.  First, she tried to look\r\ndown and make out what she was coming to, but it was too dark to\r\nsee anything; then she looked at the sides of the well, and\r\nnoticed that they were filled with cupboards and book-shelves;\r\nhere and there she saw maps and pictures hung upon pegs.  She\r\ntook down a jar from one of the shelves as she passed; it was\r\nlabelled `ORANGE MARMALADE', but to her great disappointment it\r\nwas empty:  she did not like to drop the jar for fear of killing\r\nsomebody, so managed to put it into one of the cupboards as she\r\nfell past it.\r\n\r\n  `Well!' thought Alice to herself, `after such a fall as this, I\r\nshall think nothing of tumbling down stairs!  How brave they'll\r\nall think me at home!  Why, I wouldn't say anything about it,\r\neven if I fell off the top of the house!' (Which was very likely\r\ntrue.)\r\n\r\n",
    'keywords.txt': 'False\nNone\nTrue\nand\nas\nassert\nbreak\nclass\ncontinue\ndef\ndel\nelif\nelse\nexcept\nfinally\nfor\nfrom\nglobal\nif\nimport\nin\nis\nlambda\nnonlocal\nnot\nor\npass\nraise\nreturn\ntry\nwhile\nwith\nyield\n'
  },
  description: '\u003Cdiv\u003E\n\u003Cp\u003EImplement a program that searches for keywords in a file and prints out \nall lines containing one or more of the keywords. The comparison should be\ncase-insensitive.\u003C/p\u003E\n\n\u003Cp\u003EProvide these command-line options:\u003C/p\u003E\n\u003Cul\u003E\n \u003Cli\u003E\u003Ccode\u003E-max\u003C/code\u003E \u003Cem\u003En\u003C/em\u003E prints out at most \u003Cem\u003En\u003C/em\u003E lines.\u003C/li\u003E\n \u003Cli\u003E\u003Ccode\u003E-k\u003C/code\u003E \u003Cem\u003Efile\u003C/em\u003E is the file containing the keywords. This option must be present.\u003C/li\u003E\n\u003C/ul\u003E\n\n\u003Cp\u003EFor example,\u003C/p\u003E\n\n\u003Cpre\u003Epython search.py -max 10 -k keywords.txt input.txt\n\u003C/pre\u003E\n\n\u003Cp\u003Eprints the first ten lines of \u003Ccode\u003Einput.txt\u003C/code\u003E containing one or \nmore keywords from \u003Ccode\u003Ekeywords.txt\u003C/code\u003E.\n\u003C/p\u003E \n\u003C/div\u003E\n\n'
})
