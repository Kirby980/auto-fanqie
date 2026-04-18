import sys

file_path = "/Users/hyz/Desktop/auto-fanqie/fanqie-skill/validate.js"
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace("require('../lib", "require('./lib")

with open(file_path, 'w') as f:
    f.write(content)