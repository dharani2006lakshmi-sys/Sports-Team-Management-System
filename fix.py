import os
import glob

def fix_mojibake(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Strip the BOM
    content = content.replace('\ufeff', '')
    
    try:
        # Try to reverse the Mojibake
        fixed_content = content.encode('windows-1252').decode('utf-8')
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Fixed {file_path}")
    except Exception as e:
        print(f"Could not fix {file_path}: {e}")

for file in glob.glob('*.html'):
    fix_mojibake(file)
