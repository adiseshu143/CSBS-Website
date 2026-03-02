#!/usr/bin/env python3
"""
Bulk color replacement for CSBS website CSS files
Replaces old orange color scheme with new brand color #EB4D28
"""

import re
import os

def replace_colors_in_file(filepath):
    """Replace all color instances in a CSS file"""
    
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        count = 0
        
        # Simple string replacements (case-insensitive handling)
        replacements = {
            '#F97316': '#EB4D28',
            '#f97316': '#EB4D28',
            '#FB923C': '#D8431F',
            '#fb923c': '#D8431F',
            '#ea580c': '#D8431F',
        }
        
        for old, new in replacements.items():
            new_content = content.replace(old, new)
            if new_content != content:
                count += content.count(old)
                content = new_content
        
        # Regex replacements for rgba values with flexible whitespace
        old_rgba_pattern = r'rgba\(\s*249\s*,\s*115\s*,\s*22'
        new_rgba = 'rgba(235, 77, 40'
        
        if re.search(old_rgba_pattern, content):
            content = re.sub(old_rgba_pattern, new_rgba, content)
            count += len(re.findall(old_rgba_pattern, original_content))
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {filepath}")
            print(f"   Replacements made: {count}")
            return True
        else:
            print(f"⏳ No changes needed: {filepath}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

# Files to update
css_files = [
    r'c:\Users\ADISESHU\PROJECTS\csbs_website\csbs\src\App.css',
    r'c:\Users\ADISESHU\PROJECTS\csbs_website\csbs\src\components\AdminResetModal.css',
]

print("=" * 60)
print("CSBS Color System Replacement")
print("=" * 60)

success_count = 0
for filepath in css_files:
    if replace_colors_in_file(filepath):
        success_count += 1

print("=" * 60)
print(f"✅ Complete! Updated {success_count} file(s)")
print("=" * 60)
