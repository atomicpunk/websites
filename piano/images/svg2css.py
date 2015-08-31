#!/usr/bin/python
import sys
import time
import os
import string
import re
import platform
from datetime import datetime
import struct


#for i in range(36):
#	print'\t\t<div class="bkey n%d"></div>' % i
#sys.exit()

fp = open('keyboard.svg', 'r')
totalwidth = 1250.0
keywidth = [100*23.0/totalwidth, 100*12.5374079/totalwidth]
keyleft = [100*0.48812881/totalwidth, (100*1.46259189/totalwidth) + (100*17.731297/totalwidth)]
keytype = -1
key = 0
keyclass=['.wkey.n', '.bkey.n']

print keywidth
for line in fp:
	line = line.strip()
	if line == '<rect':
		keytype += 1
		key = 0
		print('%s%d { margin-left: %f%% }' % (keyclass[keytype], key, keyleft[keytype]))
	elif line == '<use':
		key += 1
	if keytype < 0:
		continue
	if 'transform=' in line:
		m = re.match('transform="translate\((?P<n>.*),.*', line)
		left = (100*float(m.group('n'))/totalwidth) + keyleft[keytype]
		print('%s%d { margin-left: %f%% }' % (keyclass[keytype], key, left))
fp.close()
