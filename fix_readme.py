import os

with open('README.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('![CoachHub Preview](preview.png)', '![CoachHub Preview](preview_fixed.png)')

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(content)
