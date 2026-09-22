import os

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
accordion_lines = []
in_accordion = False
div_count_after_10 = 0
found_10 = False

for i, line in enumerate(lines):
    if '<!-- 1. TỔNG QUAN -->' in line:
        in_accordion = True
    
    if in_accordion:
        accordion_lines.append(line)
        if '<!-- 10. HỆ THỐNG -->' in line:
            found_10 = True
        
        if found_10 and '</div>' in line:
            div_count_after_10 += 1
            if div_count_after_10 == 2:
                in_accordion = False # We just closed the 10th group
    else:
        new_lines.append(line)

# Now accordion_lines contains the nav items.
# We need to insert them into <nav class="sidebar-accordion">
nav_idx = -1
for i, line in enumerate(new_lines):
    if '<nav class="sidebar-accordion">' in line:
        nav_idx = i
        break

if nav_idx != -1:
    # Need to remove the empty </nav> on the next line if it's there
    if '</nav>' in new_lines[nav_idx + 1]:
        new_lines.pop(nav_idx + 1)
    
    new_lines.insert(nav_idx + 1, ''.join(accordion_lines))
    new_lines.insert(nav_idx + 2, '      </nav>\n')

# Now fix the end tags
# Remove everything from '<main class="amis-main">' up to '<!-- UNIVERSAL MODAL OVERLAY -->'
final_lines = []
skip = False
for line in new_lines:
    if '<main class="amis-main">' in line:
        skip = True
        final_lines.append('      <!-- VÙNG LÀM VIỆC CHÍNH -->\n')
        final_lines.append('      <main class="amis-main">\n')
        final_lines.append('        <div id="main-content">\n')
        final_lines.append('          <!-- Dynamic feature views rendered here -->\n')
        final_lines.append('        </div>\n')
        final_lines.append('      </main>\n')
        final_lines.append('    </div>\n')
        final_lines.append('  </div>\n\n')
    if '<!-- UNIVERSAL MODAL OVERLAY -->' in line:
        skip = False
    
    if not skip:
        final_lines.append(line)

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print('Successfully fixed HTML')
