import os
import glob

replacements = {
    'ðŸ“ˆ': '📈',
    'ðŸ †': '🏆',
    'ðŸ“…': '📅',
    'ðŸ ‹ï¸ ': '🏋️',
    'ðŸ‘‹': '👋',
    'ðŸ” ': '🔐',
    'ðŸš€': '🚀',
    'ðŸ …': '🏅',
    'ðŸ”¥': '🔥',
    'ðŸ’ª': '💪',
    'âš½': '⚽',
    'ðŸ“‹': '📋',
    'ðŸ‘¥': '👥',
    'ðŸ“Š': '📊',
    'ðŸŽ¯': '🎯',
    'ðŸ”Ž': '🔍',
    'ðŸ“£': '📢',
    'âœ…': '✅',
    'ðŸš«': '🚫',
    'ðŸ”„': '🔄',
    'ðŸ“ ': '📝',
    'ðŸ”': '🔧',
    'ðŸ“°': '📰'
}

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Also strip BOM
    content = content.replace('\ufeff', '')
    
    for bad, good in replacements.items():
        content = content.replace(bad, good)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {file_path}")

for file in glob.glob('*.html'):
    fix_file(file)
