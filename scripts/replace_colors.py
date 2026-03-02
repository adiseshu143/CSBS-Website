#!/usr/bin/env python3
import os
import re

# Color mapping - old to new
replacements = [
    # Primary color changes
    ('#F97316', '#EB4D28'),
    ('#f97316', '#EB4D28'),
    ('#F97316', '#EB4D28'),
    
    # Hover and darker variants
    ('#ea580c', '#D8431F'),
    ('#fb923c', '#D8431F'),
    ('#FB923C', '#D8431F'),
    
    # Shadow and rgba changes (249, 115, 22) -> (235, 77, 40)
]

# File paths to update
files_to_update = [
    'c:\\Users\\ADISESHU\\PROJECTS\\csbs_website\\csbs\\src\\App.css',
    'c:\\Users\\ADISESHU\\PROJECTS\\csbs_website\\csbs\\src\\components\\AdminResetModal.css',
]

def replace_colors_in_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Apply all replacements
    for old, new in replacements:
        content = content.replace(old, new)
    
    # Replace rgba values with regex (handles whitespace variations)
    content = re.sub(r'rgba\(\s*249\s*,\s*115\s*,\s*22', 'rgba(235, 77, 40', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Updated: {filepath}")
    else:
        print(f"⏭️  No changes needed: {filepath}")

# Execute replacements
for filepath in files_to_update:
    replace_colors_in_file(filepath)

print("\n✅ Color replacement complete!")
