import os
import glob

replacements = {
    '#4ade80': '#dc2626',
    '#86efac': '#ef4444',
    '#10b981': '#991b1b',
    '#059669': '#7f1d1d',
    '#d1fae5': '#fecaca',
    '#6ee7b7': '#fca5a5',
    '#34d399': '#f87171',
    '#07120c': '#0b050d',
    '#0e2016': '#13081a',
    '#091710': '#150518',
    '#152d1f': '#210b24',
    '#0e2417': '#2d0b28',
    '#143220': '#3b0f34',
    '#1c442d': '#4f1444',
    '#12281b': '#250918',
    '#041a0d': '#1a040b',
}

files = glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.tsx', recursive=True)
files += glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.ts', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        new_content = new_content.replace(old.upper(), new)
        
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
